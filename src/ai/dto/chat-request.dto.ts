import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Membersihkan input teks dari tag HTML, null byte, dan karakter berbahaya.
 */
export function sanitizeChatInput(input: string): string {
  if (typeof input !== 'string') return input;
  // 1. Strip null bytes and control characters (kecuali \n \r \t)
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // 2. Strip semua tag HTML (misal <script>, <b>, <iframe ...>)
  clean = clean.replace(/<[^>]*>?/gm, '');
  return clean.trim();
}

export class ChatHistoryItemDto {
  @IsString()
  role!: 'user' | 'model';

  @Transform(({ value }) => (typeof value === 'string' ? sanitizeChatInput(value) : value))
  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class ChatRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeChatInput(value) : value))
  @IsNotEmpty({ message: 'Pesan chat tidak boleh kosong' })
  @IsString({ message: 'Pesan chat harus berupa teks' })
  @MaxLength(2000, { message: 'Pesan chat maksimal 2000 karakter' })
  message!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}

