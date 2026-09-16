import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsString({ message: 'Customer ID harus berupa string' })
  @IsNotEmpty({ message: 'Customer ID tidak boleh kosong' })
  customerId: string;

  @IsDateString({}, { message: 'periodStart harus berupa format tanggal ISO 8601 yang valid' })
  @IsNotEmpty({ message: 'periodStart tidak boleh kosong' })
  periodStart: string;

  @IsDateString({}, { message: 'periodEnd harus berupa format tanggal ISO 8601 yang valid' })
  @IsNotEmpty({ message: 'periodEnd tidak boleh kosong' })
  periodEnd: string;

  @IsDateString({}, { message: 'dueDate harus berupa format tanggal ISO 8601 yang valid' })
  @IsNotEmpty({ message: 'dueDate tidak boleh kosong' })
  dueDate: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'amount harus berupa angka' })
  @Min(0, { message: 'amount minimal bernilai 0' })
  amount: number;
}
