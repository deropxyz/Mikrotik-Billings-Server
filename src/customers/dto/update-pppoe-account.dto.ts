import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdatePppoeAccountDto {
  @IsString({ message: 'PPPoE username harus berupa string' })
  @IsOptional()
  @MinLength(3, { message: 'PPPoE username minimal 3 karakter' })
  @MaxLength(50, { message: 'PPPoE username maksimal 50 karakter' })
  username?: string;

  @IsString({ message: 'PPPoE password harus berupa string' })
  @IsOptional()
  @MinLength(4, { message: 'PPPoE password minimal 4 karakter' })
  password?: string;

  @IsBoolean({ message: 'Status isEnabled harus berupa boolean' })
  @IsOptional()
  isEnabled?: boolean;
}
