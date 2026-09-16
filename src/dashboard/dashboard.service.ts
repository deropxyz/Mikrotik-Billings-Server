import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte, count } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { customers, invoices } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { NetworkService } from '../network/network.service.js';
import { RoutersService } from '../routers/routers.service.js';
import type { RevenueQueryDto } from './dto/revenue-query.dto.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: Database,
    private readonly networkService: NetworkService,
    private readonly routersService: RoutersService,
  ) {}

  /**
   * Menghitung total pelanggan dan breakdown berdasarkan status (ACTIVE / INACTIVE).
   */
  async getTotalCustomers() {
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(customers);

    const total = Number(totalResult?.count ?? 0);

    const grouped = await this.db
      .select({
        status: customers.status,
        count: count(),
      })
      .from(customers)
      .groupBy(customers.status);

    const byStatus: Record<string, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
    };

    for (const item of grouped) {
      byStatus[item.status] = Number(item.count);
    }

    return {
      total,
      active: byStatus['ACTIVE'] ?? 0,
      inactive: byStatus['INACTIVE'] ?? 0,
      byStatus,
    };
  }

  /**
   * Mengambil data pelanggan online dari NetworkService.
   */
  async getOnlineCustomers() {
    try {
      const sessions = await this.networkService.getActiveSessions();
      return {
        count: sessions.length,
        sessions,
      };
    } catch (error) {
      this.logger.warn(
        `Gagal mengambil sesi online dari router: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        count: 0,
        sessions: [],
        error: error instanceof Error ? error.message : 'Router unreachable',
      };
    }
  }

  /**
   * Mengambil kalkulasi pelanggan yang sedang offline (total pelanggan - pelanggan online).
   */
  async getOfflineCustomers() {
    const totalData = await this.getTotalCustomers();
    const onlineData = await this.getOnlineCustomers();
    const offlineCount = Math.max(0, totalData.total - onlineData.count);

    return {
      count: offlineCount,
    };
  }

  /**
   * Menghitung jumlah invoice yang belum dibayar (UNPAID).
   */
  async getUnpaidCount(): Promise<number> {
    const [res] = await this.db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.status, 'UNPAID'));

    return Number(res?.count ?? 0);
  }

  /**
   * Menghitung jumlah invoice yang overdue (OVERDUE).
   */
  async getOverdueCount(): Promise<number> {
    const [res] = await this.db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.status, 'OVERDUE'));

    return Number(res?.count ?? 0);
  }

  /**
   * Menghitung total pendapatan per bulan dari invoice yang sudah dibayar (PAID).
   */
  async getMonthlyRevenue(periodInput?: RevenueQueryDto | string) {
    let year: number;
    let month: number;

    const now = new Date();

    if (typeof periodInput === 'string') {
      const [y, m] = periodInput.split('-').map(Number);
      year = y || now.getFullYear();
      month = m || now.getMonth() + 1;
    } else if (periodInput?.period) {
      const [y, m] = periodInput.period.split('-').map(Number);
      year = y || now.getFullYear();
      month = m || now.getMonth() + 1;
    } else {
      year = periodInput?.year ?? now.getFullYear();
      month = periodInput?.month ?? now.getMonth() + 1;
    }

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const paidInvoices = await this.db
      .select({
        id: invoices.id,
        amount: invoices.amount,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'PAID'),
          gte(invoices.periodStart, startDate),
          lte(invoices.periodStart, endDate),
        ),
      );

    const totalRevenue = paidInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0,
    );

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      totalRevenue,
      paidInvoiceCount: paidInvoices.length,
    };
  }

  /**
   * Mengambil status dari semua router terdaftar.
   */
  async getRouterStatuses() {
    const allRouters = await this.routersService.findAll();

    const results = await Promise.all(
      allRouters.map(async (router) => {
        try {
          const status = await this.networkService.getRouterStatus(router.id);
          return {
            routerId: router.id,
            routerName: router.name,
            host: router.host,
            isActive: router.isActive,
            status: 'ONLINE',
            resource: status.resource,
          };
        } catch (error) {
          return {
            routerId: router.id,
            routerName: router.name,
            host: router.host,
            isActive: router.isActive,
            status: 'OFFLINE',
            error: error instanceof Error ? error.message : 'Router unreachable',
          };
        }
      }),
    );

    return results;
  }
}
