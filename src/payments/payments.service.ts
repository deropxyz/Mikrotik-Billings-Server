import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { payments, invoices, customers } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: Database,
  ) {}

  /**
   * Catat pembayaran baru untuk suatu invoice.
   * Menggunakan Drizzle transaction secara atomic:
   * 1. Insert data ke tabel `payments`
   * 2. Otomatis update status `invoices` menjadi 'PAID'
   */
  async recordPayment(dto: RecordPaymentDto) {
    // 1. Validasi invoice ada
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, dto.invoiceId))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException(`Invoice dengan ID "${dto.invoiceId}" tidak ditemukan`);
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException(`Invoice dengan ID "${dto.invoiceId}" sudah lunas (PAID)`);
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException(`Invoice dengan ID "${dto.invoiceId}" telah dibatalkan (CANCELLED)`);
    }

    // 2. Transaksi atomic: simpan payment dan update status invoice ke PAID
    const paidDate = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const isVerified = Boolean(dto.verifiedBy);

    const result = await this.db.transaction(async (tx) => {
      const [newPayment] = await tx
        .insert(payments)
        .values({
          invoiceId: dto.invoiceId,
          amount: dto.amount.toString(),
          proofRef: dto.proofRef,
          paidAt: paidDate,
          verifiedBy: dto.verifiedBy,
          status: isVerified ? 'VERIFIED' : 'PENDING',
          verifiedAt: isVerified ? new Date() : null,
        })
        .returning();

      const [updatedInvoice] = await tx
        .update(invoices)
        .set({ status: 'PAID' })
        .where(eq(invoices.id, dto.invoiceId))
        .returning();

      return {
        payment: newPayment,
        invoice: updatedInvoice,
      };
    });

    this.logger.log(
      `Pembayaran dicatat: Payment ID ${result.payment.id} untuk Invoice ${invoice.invoiceNo} (Status invoice sekarang: PAID)`,
    );

    return result;
  }

  /**
   * Ambil riwayat pembayaran untuk pelanggan tertentu.
   */
  async getPaymentHistory(customerId: string) {
    // 1. Pastikan customer ada
    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Pelanggan dengan ID "${customerId}" tidak ditemukan`);
    }

    // 2. Query pembayaran terkait customer melalui invoice
    const history = await this.db
      .select({
        payment: payments,
        invoice: {
          id: invoices.id,
          invoiceNo: invoices.invoiceNo,
          periodStart: invoices.periodStart,
          periodEnd: invoices.periodEnd,
          dueDate: invoices.dueDate,
          amount: invoices.amount,
          status: invoices.status,
        },
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(payments.createdAt));

    return history.map((item) => ({
      ...item.payment,
      invoice: item.invoice,
    }));
  }
}
