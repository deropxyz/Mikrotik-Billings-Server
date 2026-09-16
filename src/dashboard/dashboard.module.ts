import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { NetworkModule } from '../network/network.module.js';
import { RoutersModule } from '../routers/routers.module.js';

@Module({
  imports: [NetworkModule, RoutersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
