import { Injectable, NotFoundException } from '@nestjs/common';
import { NetworkService } from '../../network/network.service.js';
import { CustomersService } from '../../customers/customers.service.js';
import type { AiTool } from './tool.interface.js';

@Injectable()
export class GetCustomerStatusTool implements AiTool {
  name = 'get_customer_status';
  description =
    'Mengecek status jaringan pelanggan di MikroTik (apakah sedang online/offline, IP address, uptime sesi, dan router terkait). Bisa menerima customer_id (UUID) atau customer_name.';

  parameters = {
    type: 'object',
    properties: {
      customer_id: {
        type: 'string',
        description: 'ID UUID pelanggan. Opsional jika customer_name disediakan.',
      },
      customer_name: {
        type: 'string',
        description: 'Nama atau username PPPoE pelanggan jika ID tidak diketahui.',
      },
    },
  };

  constructor(
    private readonly networkService: NetworkService,
    private readonly customersService: CustomersService,
  ) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    let customerId = typeof args['customer_id'] === 'string' ? args['customer_id'].trim() : '';
    let customerName = typeof args['customer_name'] === 'string' ? args['customer_name'].trim() : '';

    // Jika customer_id tidak disediakan atau bukan format UUID, coba cari by customer_name atau query
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
        message: 'Mohon berikan customer_id atau customer_name untuk mengecek status jaringan.',
      };
    }

    try {
      const status = await this.networkService.getCustomerNetworkStatus(customerId);

      // Jika belum punya nama pelanggan, coba ambil dari customersService
      if (!customerName) {
        try {
          const cust = await this.customersService.findOne(customerId);
          customerName = cust.name;
        } catch {
          customerName = status.username;
        }
      }

      return {
        found: true,
        customerId: status.customerId,
        name: customerName,
        username: status.username,
        isOnline: Boolean(status.liveSession),
        isEnabled: status.isEnabled,
        ipAddress: status.liveSession?.ipAddress ?? status.lastKnownSession?.ipAddress ?? null,
        uptime: status.liveSession?.uptime ?? null,
        router: status.router,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        return {
          found: false,
          message: err.message,
        };
      }
      return {
        found: false,
        message: `Gagal mengambil status jaringan: ${err instanceof Error ? err.message : 'Terjadi kendala pada jaringan'}`,
      };
    }
  }
}
