import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/index.js';
import { CustomerStatus, ServiceStatus } from '../../common/enums/index.js';

export class SearchCustomerDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CustomerStatus, { message: 'Status tidak valid' })
  status?: CustomerStatus;

  @IsOptional()
  @IsEnum(ServiceStatus, { message: 'Service status tidak valid' })
  serviceStatus?: ServiceStatus;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  packageId?: string;
}
