import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { CustomerStatus, ServiceStatus } from '../../common/enums/index.js';

export class UpdateCustomerDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsOptional()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name?: string;

  @IsString({ message: 'Nomor telepon harus berupa string' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'Alamat harus berupa string' })
  @IsOptional()
  address?: string;

  @IsString({ message: 'Zona harus berupa string' })
  @IsOptional()
  zone?: string;

  @IsString({ message: 'Package ID harus berupa string' })
  @IsOptional()
  packageId?: string;

  @IsString({ message: 'Router ID harus berupa string' })
  @IsOptional()
  routerId?: string;

  @IsEnum(CustomerStatus, { message: 'Status tidak valid' })
  @IsOptional()
  status?: CustomerStatus;

  @IsEnum(ServiceStatus, { message: 'Service status tidak valid' })
  @IsOptional()
  serviceStatus?: ServiceStatus;
}
