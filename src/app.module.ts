import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DrizzleModule } from './db/db.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { PackagesModule } from './packages/packages.module.js';
import { RoutersModule } from './routers/routers.module.js';
import { BillingModule } from './billing/billing.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { NetworkModule } from './network/network.module.js';
import { AuditModule } from './audit/audit.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DrizzleModule,
    CommonModule,
    AuthModule,
    PackagesModule,
    RoutersModule,
    CustomersModule,
    BillingModule,
    PaymentsModule,
    NetworkModule,
    AuditModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
