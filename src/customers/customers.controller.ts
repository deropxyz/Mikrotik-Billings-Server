import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { SearchCustomerDto } from './dto/search-customer.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * POST /customers
   * Buat pelanggan baru.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  /**
   * GET /customers
   * List pelanggan dengan pagination, search, dan filter.
   */
  @Get()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async findAll(@Query() query: SearchCustomerDto) {
    return this.customersService.findAll(query);
  }

  /**
   * GET /customers/:id
   * Detail pelanggan + relasi (package, router, pppoe, invoices, sessions).
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  /**
   * PATCH /customers/:id
   * Update data pelanggan.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  /**
   * DELETE /customers/:id
   * Deaktivasi pelanggan (soft delete).
   */
  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    return this.customersService.deactivate(id);
  }
}
