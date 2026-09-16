import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { RevenueQueryDto } from './dto/revenue-query.dto.js';

@Controller(['api/dashboard', 'dashboard'])
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/stats atau /dashboard/stats
   * Mengembalikan rangkuman statistik utama: total pelanggan, online, offline, unpaid, dan overdue.
   */
  @Get('stats')
  async getStats() {
    const [totalCustomers, onlineData, offlineData, unpaidCount, overdueCount] =
      await Promise.all([
        this.dashboardService.getTotalCustomers(),
        this.dashboardService.getOnlineCustomers(),
        this.dashboardService.getOfflineCustomers(),
        this.dashboardService.getUnpaidCount(),
        this.dashboardService.getOverdueCount(),
      ]);

    return {
      totalCustomers,
      onlineCustomers: onlineData.count,
      offlineCustomers: offlineData.count,
      unpaidCount,
      overdueCount,
    };
  }

  /**
   * GET /api/dashboard/revenue atau /dashboard/revenue
   * Mengembalikan kalkulasi total pendapatan pada periode tertentu.
   */
  @Get('revenue')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getRevenue(@Query() query: RevenueQueryDto) {
    return this.dashboardService.getMonthlyRevenue(query);
  }

  /**
   * GET /api/dashboard/network-status atau /dashboard/network-status
   * Mengembalikan status seluruh router dan live network session.
   */
  @Get('network-status')
  async getNetworkStatus() {
    const [onlineData, routerStatuses] = await Promise.all([
      this.dashboardService.getOnlineCustomers(),
      this.dashboardService.getRouterStatuses(),
    ]);

    return {
      onlineCustomers: onlineData.count,
      activeSessions: onlineData.sessions,
      routerStatuses,
    };
  }
}
