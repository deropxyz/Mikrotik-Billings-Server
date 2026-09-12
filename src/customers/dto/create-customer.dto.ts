import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name: string;

  @IsString({ message: 'Nomor telepon harus berupa string' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  phone: string;

  @IsString({ message: 'Alamat harus berupa string' })
  @IsNotEmpty({ message: 'Alamat tidak boleh kosong' })
  address: string;

  @IsString({ message: 'Zona harus berupa string' })
  @IsNotEmpty({ message: 'Zona tidak boleh kosong' })
  zone: string;

  @IsString({ message: 'Package ID harus berupa string' })
  @IsNotEmpty({ message: 'Package ID tidak boleh kosong' })
  packageId: string;

  @IsString({ message: 'Router ID harus berupa string' })
  @IsNotEmpty({ message: 'Router ID tidak boleh kosong' })
  routerId: string;

  @IsString({ message: 'PPPoE username harus berupa string' })
  @IsOptional()
  pppoeUsername?: string;
}
