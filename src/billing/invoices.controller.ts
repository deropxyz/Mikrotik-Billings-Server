import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { InvoiceFilterDto } from './dto/invoice-filter.dto.js';

@Controller(['invoices', 'api/invoices'])
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * POST /invoices atau /api/invoices
   * Buat invoice secara manual.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(dto);
  }

  /**
   * GET /invoices atau /api/invoices
   * List invoice dengan filter dan pagination.
   */
  @Get()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async findAll(@Query() query: InvoiceFilterDto) {
    return this.invoicesService.listInvoices(query);
  }

  /**
   * GET /invoices/unpaid atau /api/invoices/unpaid
   * Daftar semua invoice yang belum dibayar.
   */
  @Get('unpaid')
  async getUnpaid() {
    return this.invoicesService.getUnpaidInvoices();
  }

  /**
   * GET /invoices/overdue atau /api/invoices/overdue
   * Daftar semua invoice yang sudah lewat jatuh tempo.
   */
  @Get('overdue')
  async getOverdue() {
    return this.invoicesService.getOverdueInvoices();
  }

  /**
   * GET /invoices/:id atau /api/invoices/:id
   * Detail invoice beserta data pelanggan dan riwayat pembayaran.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.invoicesService.getInvoiceDetail(id);
  }
}
