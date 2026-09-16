import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecordPaymentDto {
  @IsString({ message: 'Invoice ID harus berupa string' })
  @IsNotEmpty({ message: 'Invoice ID tidak boleh kosong' })
  invoiceId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'amount harus berupa angka' })
  @Min(0, { message: 'amount minimal bernilai 0' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'proofRef harus berupa string' })
  proofRef?: string;

  @IsOptional()
  @IsDateString({}, { message: 'paidAt harus berupa tanggal ISO valid' })
  paidAt?: string;

  @IsOptional()
  @IsString({ message: 'verifiedBy harus berupa string User ID' })
  verifiedBy?: string;
}
