import { Injectable, NotFoundException } from '@nestjs/common';
import { NetworkService } from '../../network/network.service.js';
import { RoutersService } from '../../routers/routers.service.js';
import type { AiTool } from './tool.interface.js';

@Injectable()
export class GetRouterStatusTool implements AiTool {
  name = 'get_router_status';
  description =
    'Mengecek status kesehatan dan penggunaan resource router MikroTik (CPU load, free memory, total memory, uptime, dan versi RouterOS).';

  parameters = {
    type: 'object',
    properties: {
      router_id: {
        type: 'string',
        description:
          'ID UUID router. Opsional. Jika tidak diisi, sistem akan mengecek router aktif pertama.',
      },
    },
  };

  constructor(
    private readonly networkService: NetworkService,
    private readonly routersService: RoutersService,
  ) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    let routerId = typeof args['router_id'] === 'string' ? args['router_id'].trim() : '';

    if (!routerId) {
      const allRouters = await this.routersService.findAll();
      if (!allRouters || allRouters.length === 0) {
        return {
          found: false,
          message: 'Belum ada router yang terdaftar di sistem.',
        };
      }
      const activeRouter = allRouters.find((r) => r.isActive) || allRouters[0];
      routerId = activeRouter.id;
    }

    try {
      const status = await this.networkService.getRouterStatus(routerId);

      return {
        found: true,
        routerId: status.routerId,
        routerName: status.routerName,
        host: status.host,
        isActive: status.isActive,
        resource: {
          cpuLoad: status.resource.cpuLoad,
          freeMemoryMb: status.resource.freeMemoryMb,
          totalMemoryMb: status.resource.totalMemoryMb,
          uptime: status.resource.uptime,
          version: status.resource.version,
          boardName: status.resource.boardName,
        },

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
        routerId,
        message: err instanceof Error ? err.message : 'Gagal menghubungi router',
      };
    }
  }
}
