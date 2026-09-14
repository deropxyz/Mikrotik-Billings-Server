import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePackageDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name: string;

  @IsInt({ message: 'Speed harus berupa bilangan bulat' })
  @IsPositive({ message: 'Speed harus lebih besar dari 0' })
  @Type(() => Number)
  speedMbps: number;

  @IsNumber({}, { message: 'Harga bulanan harus berupa angka' })
  @Min(0, { message: 'Harga bulanan tidak boleh negatif' })
  @Type(() => Number)
  monthlyPrice: number;
}
