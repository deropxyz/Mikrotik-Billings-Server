import { Module } from '@nestjs/common';
import { AIService } from './ai.service.js';
import { AIController } from './ai.controller.js';
import { AIConfirmationService } from './ai-confirmation.service.js';
import { GetCustomerTool } from './tools/get-customer.tool.js';
import { GetUnpaidCustomersTool } from './tools/get-unpaid-customers.tool.js';
import { GetCustomerStatusTool } from './tools/get-customer-status.tool.js';
import { GetRouterStatusTool } from './tools/get-router-status.tool.js';
import { DisconnectCustomerTool } from './tools/disconnect-customer.tool.js';
import { ReconnectCustomerTool } from './tools/reconnect-customer.tool.js';
import { ConfirmActionTool } from './tools/confirm-action.tool.js';
import { CustomersModule } from '../customers/customers.module.js';
import { NetworkModule } from '../network/network.module.js';
import { RoutersModule } from '../routers/routers.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    CustomersModule,
    NetworkModule,
    RoutersModule,
    AuthModule,
    AuditModule,
  ],
  controllers: [AIController],
  providers: [
    AIService,
    AIConfirmationService,
    GetCustomerTool,
    GetUnpaidCustomersTool,
    GetCustomerStatusTool,
    GetRouterStatusTool,
    DisconnectCustomerTool,
    ReconnectCustomerTool,
    ConfirmActionTool,
  ],
  exports: [AIService],
})
export class AIModule {}
