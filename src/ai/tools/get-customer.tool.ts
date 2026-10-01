import { Injectable } from '@nestjs/common';
import { CustomersService } from '../../customers/customers.service.js';
import type { AiTool } from './tool.interface.js';

@Injectable()
export class GetCustomerTool implements AiTool {
  name = 'get_customer';
  description =
    'Mencari data pelanggan berdasarkan nama atau nomor telepon. Gunakan tool ini ketika operator bertanya tentang detail pelanggan tertentu.';

  parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Nama pelanggan atau nomor telepon yang dicari',
      },
    },
    required: ['query'],
  };

  constructor(private readonly customersService: CustomersService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const query = typeof args['query'] === 'string' ? args['query'] : '';
    if (!query.trim()) {
      return {
        found: false,
        message: 'Query pencarian pelanggan tidak boleh kosong',
        customers: [],
      };
    }

    const result = await this.customersService.findAll({ search: query.trim(), limit: 5 });
    const items = result.items || [];

    return {
      found: items.length > 0,
      totalFound: items.length,
      customers: items.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        zone: c.zone,
        status: c.status,
        serviceStatus: c.serviceStatus,
        pppoeUsername: c.pppoeAccount?.username ?? null,
        package: c.package
          ? {
              id: c.package.id,
              name: c.package.name,
              price: Number(c.package.monthlyPrice),
              speedMbps: c.package.speedMbps,
            }
          : null,

        router: c.router
          ? {
              id: c.router.id,
              name: c.router.name,
            }
          : null,
      })),
    };
  }
}
