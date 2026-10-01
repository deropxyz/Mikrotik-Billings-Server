import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmActionDto {
  @IsNotEmpty()
  @IsString()
  confirmationToken!: string;
}
