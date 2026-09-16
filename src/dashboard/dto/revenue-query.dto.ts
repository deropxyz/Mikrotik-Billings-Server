import { IsOptional, IsInt, Min, Max, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class RevenueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'year harus berupa angka bulat' })
  @Min(2000, { message: 'year minimal 2000' })
  @Max(2100, { message: 'year maksimal 2100' })
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'month harus berupa angka 1 - 12' })
  @Min(1, { message: 'month minimal 1' })
  @Max(12, { message: 'month maksimal 12' })
  month?: number;

  @IsOptional()
  @IsString({ message: 'period harus berupa format YYYY-MM' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'period harus berformat YYYY-MM (contoh: 2026-09)',
  })
  period?: string;
}
