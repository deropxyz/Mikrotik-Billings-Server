import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DrizzleModule } from './db/db.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { PackagesModule } from './packages/packages.module.js';
import { RoutersModule } from './routers/routers.module.js';

@Module({
  imports: [
    DrizzleModule,
    CommonModule,
    AuthModule,
    PackagesModule,
    RoutersModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
