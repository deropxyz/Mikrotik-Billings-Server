import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// Protected: Requires valid JWT and ADMIN role
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments atau /api/payments
   * Catat pembayaran baru untuk suatu invoice.
   */
  @Post(['payments', 'api/payments'])
  @HttpCode(HttpStatus.CREATED)
  async recordPayment(@Body() dto: RecordPaymentDto) {
    return this.paymentsService.recordPayment(dto);
  }

  /**
   * GET /customers/:id/payments atau /api/customers/:id/payments
   * Dapatkan riwayat pembayaran pelanggan tertentu.
   */
  @Get([
    'customers/:id/payments',
    'api/customers/:id/payments',
    'payments/customer/:id',
    'api/payments/customer/:id',
  ])
  async getPaymentHistory(@Param('id') customerId: string) {
    return this.paymentsService.getPaymentHistory(customerId);
  }
}
