import { Injectable } from '@nestjs/common';
import { CustomersService } from '../../customers/customers.service.js';
import { NetworkService } from '../../network/network.service.js';
import { AIConfirmationService } from '../ai-confirmation.service.js';
import type { AiTool } from './tool.interface.js';
import type { ConfirmationPending } from '../types/confirmation.types.js';

@Injectable()
export class ReconnectCustomerTool implements AiTool {
  name = 'reconnect_customer';
  description = `Mengaktifkan kembali koneksi internet pelanggan di router MikroTik.
PENTING: Tool ini akan mengembalikan permintaan konfirmasi terlebih dahulu.
AI harus menampilkan detail aksi dan meminta konfirmasi operator sebelum benar-benar mengeksekusi.
Gunakan tool confirm_action dengan token yang diberikan setelah operator mengkonfirmasi.`;

  parameters = {
    type: 'object',
    properties: {
      customer_id: {
        type: 'string',
        description: 'UUID pelanggan. Opsional jika customer_name disediakan.',
      },
      customer_name: {
        type: 'string',
        description: 'Nama atau username PPPoE pelanggan jika ID tidak diketahui.',
      },
    },
  };

  constructor(
    private readonly customersService: CustomersService,
    private readonly networkService: NetworkService,
    private readonly confirmationService: AIConfirmationService,
  ) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    let customerId = typeof args['customer_id'] === 'string' ? args['customer_id'].trim() : '';
    let customerName = typeof args['customer_name'] === 'string' ? args['customer_name'].trim() : '';

    if (!customerId && customerName) {
      const searchRes = await this.customersService.findAll({ search: customerName, limit: 1 });
      const found = searchRes.items?.[0];
      if (!found) {
        return {
          found: false,
          message: `Pelanggan dengan nama/query "${customerName}" tidak ditemukan di sistem.`,
        };
      }
      customerId = found.id;
      customerName = found.name;
    }

    if (!customerId) {
      return {
        found: false,
        message: 'Mohon berikan customer_id atau customer_name untuk mengaktifkan kembali koneksi pelanggan.',
      };
    }

    try {
      const status = await this.networkService.getCustomerNetworkStatus(customerId);

      if (!customerName) {
        try {
          const cust = await this.customersService.findOne(customerId);
          customerName = cust.name;
        } catch {
          customerName = status.username;
        }
      }

      const pppoeUsername = status.username;
      const routerName = status.router?.name ?? 'Unknown Router';

      const token = this.confirmationService.createPendingAction(
        'RECONNECT_CUSTOMER',
        customerId,
        'operator',
      );

      const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

      const result: ConfirmationPending = {
        requiresConfirmation: true,
        confirmationToken: token,
        action: 'RECONNECT_CUSTOMER',
        details: {
          customerId,
          customerName,
          pppoeUsername,
          routerName,
        },
        confirmationMessage: `Apakah Anda yakin ingin MENGAKTIFKAN KEMBALI koneksi internet ${customerName} (PPPoE: ${pppoeUsername} di ${routerName})?`,
        expiresAt,
      };

      return result;
    } catch (err) {
      return {
        found: false,
        message: `Gagal mendapatkan data koneksi pelanggan: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }
}
