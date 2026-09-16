import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq, and, lt, gte, lte, ilike, count } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { invoices, customers } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { InvoiceFilterDto } from './dto/invoice-filter.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: Database,
  ) {}

  /**
   * Buat invoice secara manual.
   */
  async createInvoice(dto: CreateInvoiceDto) {
    // 1. Validasi customer ada
    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, dto.customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Pelanggan dengan ID "${dto.customerId}" tidak ditemukan`);
    }

    // 2. Generate nomor invoice otomatis (INV-YYYYMM-XXXX)
    const invoiceNo = await this.generateInvoiceNo(new Date(dto.periodStart));

    // 3. Insert invoice baru
    const [invoice] = await this.db
      .insert(invoices)
      .values({
        invoiceNo,
        customerId: dto.customerId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        dueDate: new Date(dto.dueDate),
        amount: dto.amount.toString(),
        status: 'UNPAID',
      })
      .returning();

    this.logger.log(`Invoice dibuat: ${invoice.invoiceNo} (ID: ${invoice.id}) untuk pelanggan ${dto.customerId}`);
    return invoice;
  }

  /**
   * List invoices dengan filter dan pagination.
   */
  async listInvoices(filter: InvoiceFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filter.customerId) {
      conditions.push(eq(invoices.customerId, filter.customerId));
    }

    if (filter.status) {
      conditions.push(eq(invoices.status, filter.status));
    }

    if (filter.periodStart) {
      conditions.push(gte(invoices.periodStart, new Date(filter.periodStart)));
    }

    if (filter.periodEnd) {
      conditions.push(lte(invoices.periodEnd, new Date(filter.periodEnd)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(invoices)
      .where(whereClause);

    const totalItems = totalResult?.count ?? 0;

    // Fetch items beserta relasi customer
    const items = await this.db.query.invoices.findMany({
      where: whereClause,
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            phone: true,
            address: true,
            zone: true,
          },
        },
      },
      limit,
      offset,
      orderBy: (inv, { desc }) => [desc(inv.createdAt)],
    });

    return new PaginatedResponseDto(items, page, limit, totalItems);
  }

  /**
   * Ambil detail invoice beserta data pelanggan dan riwayat pembayaran.
   */
  async getInvoiceDetail(id: string) {
    const invoice = await this.db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        customer: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice dengan ID "${id}" tidak ditemukan`);
    }

    return invoice;
  }

  /**
   * Ambil semua invoice yang belum dibayar (status UNPAID), diurutkan berdasarkan dueDate ASC.
   */
  async getUnpaidInvoices() {
    return this.db.query.invoices.findMany({
      where: eq(invoices.status, 'UNPAID'),
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: (inv, { asc }) => [asc(inv.dueDate)],
    });
  }

  /**
   * Ambil semua invoice yang overdue (status OVERDUE), diurutkan berdasarkan dueDate ASC.
   */
  async getOverdueInvoices() {
    return this.db.query.invoices.findMany({
      where: eq(invoices.status, 'OVERDUE'),
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: (inv, { asc }) => [asc(inv.dueDate)],
    });
  }

  /**
   * Tandai invoice UNPAID yang melewati due date menjadi OVERDUE.
   * Return jumlah invoice yang diupdate.
   */
  async markOverdueInvoices(): Promise<number> {
    const now = new Date();
    const updated = await this.db
      .update(invoices)
      .set({ status: 'OVERDUE' })
      .where(and(eq(invoices.status, 'UNPAID'), lt(invoices.dueDate, now)))
      .returning({ id: invoices.id });

    return updated.length;
  }

  /**
   * Cron job harian untuk otomatis menandai invoice yang overdue.
   * Berjalan setiap hari pada pukul 01:00 pagi.
   */
  @Cron('0 1 * * *')
  async handleOverdueCron() {
    this.logger.log('Menjalankan pengecekan invoice overdue otomatis...');
    try {
      const count = await this.markOverdueInvoices();
      this.logger.log(`Pengecekan selesai. ${count} invoice diperbarui ke status OVERDUE`);
    } catch (error) {
      this.logger.error('Gagal menjalankan pengecekan overdue invoice', error);
    }
  }

  /**
   * Helper untuk membuat format nomor invoice: INV-YYYYMM-XXXX
   */
  private async generateInvoiceNo(date: Date): Promise<string> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}`;

    const [result] = await this.db
      .select({ count: count() })
      .from(invoices)
      .where(ilike(invoices.invoiceNo, `${prefix}%`));

    const seq = (Number(result?.count ?? 0) + 1).toString().padStart(4, '0');
    return `${prefix}-${seq}`;
  }
}
