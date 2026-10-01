import { Injectable } from '@nestjs/common';
import { AIConfirmationService } from '../ai-confirmation.service.js';
import type { AiTool } from './tool.interface.js';

@Injectable()
export class ConfirmActionTool implements AiTool {
  name = 'confirm_action';
  description = `Mengeksekusi aksi yang menunggu konfirmasi berdasarkan confirmation_token.
Gunakan tool ini HANYA setelah operator secara eksplisit menyatakan setuju/konfirmasi.
Jangan panggil tool ini jika operator belum mengkonfirmasi atau menolak aksi.`;

  parameters = {
    type: 'object',
    properties: {
      confirmation_token: {
        type: 'string',
        description: 'Token konfirmasi dari hasil tool disconnect_customer atau reconnect_customer.',
      },
    },
    required: ['confirmation_token'],
  };

  constructor(private readonly confirmationService: AIConfirmationService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const token = typeof args['confirmation_token'] === 'string'
      ? args['confirmation_token'].trim()
      : '';

    if (!token) {
      return { success: false, message: 'confirmation_token tidak boleh kosong.' };
    }

    const resultMessage = await this.confirmationService.executeConfirmedAction(token);
    return { success: true, message: resultMessage };
  }
}
