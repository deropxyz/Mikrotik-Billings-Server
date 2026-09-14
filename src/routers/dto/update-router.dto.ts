import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRouterDto {
  @IsString({ message: 'Nama router harus berupa string' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Model router harus berupa string' })
  @IsOptional()
  model?: string;

  @IsString({ message: 'Versi RouterOS harus berupa string' })
  @IsOptional()
  routerOsVersion?: string;

  @IsString({ message: 'Host/IP harus berupa string' })
  @IsOptional()
  host?: string;

  @IsInt({ message: 'API Port harus berupa bilangan bulat' })
  @Min(1, { message: 'API Port minimal 1' })
  @Max(65535, { message: 'API Port maksimal 65535' })
  @IsOptional()
  @Type(() => Number)
  apiPort?: number;

  @IsBoolean({ message: 'isActive harus berupa boolean' })
  @IsOptional()
  isActive?: boolean;
}
