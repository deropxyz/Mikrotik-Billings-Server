import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRouterDto {
  @IsString({ message: 'Nama router harus berupa string' })
  @IsNotEmpty({ message: 'Nama router tidak boleh kosong' })
  name: string;

  @IsString({ message: 'Model router harus berupa string' })
  @IsNotEmpty({ message: 'Model router tidak boleh kosong' })
  model: string;

  @IsString({ message: 'Versi RouterOS harus berupa string' })
  @IsNotEmpty({ message: 'Versi RouterOS tidak boleh kosong' })
  routerOsVersion: string;

  @IsString({ message: 'Host/IP harus berupa string' })
  @IsNotEmpty({ message: 'Host/IP tidak boleh kosong' })
  host: string;

  @IsInt({ message: 'API Port harus berupa bilangan bulat' })
  @Min(1, { message: 'API Port minimal 1' })
  @Max(65535, { message: 'API Port maksimal 65535' })
  @IsOptional()
  @Type(() => Number)
  apiPort?: number;
}
