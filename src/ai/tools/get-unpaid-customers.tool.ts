import { Injectable } from '@nestjs/common';
import { CustomersService } from '../../customers/customers.service.js';
import { ServiceStatus } from '../../common/enums/index.js';
import type { AiTool } from './tool.interface.js';

@Injectable()
export class GetUnpaidCustomersTool implements AiTool {
  name = 'get_unpaid_customers';
  description =
    'Mendapatkan daftar pelanggan yang belum membayar tagihan atau berstatus SUSPENDED. Bisa difilter berdasarkan zona RT/RW.';

  parameters = {
    type: 'object',
    properties: {
      zone: {
        type: 'string',
        description: 'Filter berdasarkan zona atau wilayah pelanggan (contoh: RT-01, RW-02)',
      },
      limit: {
        type: 'number',
        description: 'Maksimal data pelanggan yang dikembalikan (default: 20)',
      },
    },
  };

  constructor(private readonly customersService: CustomersService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const zone = typeof args['zone'] === 'string' && args['zone'].trim() ? args['zone'].trim() : undefined;
    const limit = typeof args['limit'] === 'number' && args['limit'] > 0 ? args['limit'] : 20;

    const result = await this.customersService.findAll({
      serviceStatus: ServiceStatus.SUSPENDED,
      zone,
      limit,
    });

    const items = result.items || [];

    return {
      total: items.length,
      zoneFilter: zone ?? 'semua_zona',
      customers: items.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        zone: c.zone,
        status: c.status,
        serviceStatus: c.serviceStatus,
        package: c.package
          ? {
              name: c.package.name,
              price: Number(c.package.monthlyPrice),
            }
          : null,
      })),
    };
  }
}

