import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export const InvoiceStatusValues = ['UNPAID', 'PAID', 'OVERDUE', 'CANCELLED'] as const;
export type InvoiceStatus = (typeof InvoiceStatusValues)[number];

export class InvoiceFilterDto extends PaginationDto {
  @IsOptional()
  @IsString({ message: 'Customer ID harus berupa string' })
  customerId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatusValues, {
    message: 'Status harus bernilai salah satu dari: UNPAID, PAID, OVERDUE, CANCELLED',
  })
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString({}, { message: 'periodStart harus berupa tanggal ISO valid' })
  periodStart?: string;

  @IsOptional()
  @IsDateString({}, { message: 'periodEnd harus berupa tanggal ISO valid' })
  periodEnd?: string;
}
