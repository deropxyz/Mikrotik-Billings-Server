import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NetworkService } from './network.service.js';

@Controller()
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  /**
   * GET /customers/:id/network atau /api/customers/:id/network
   * Mengambil status koneksi jaringan pelanggan (live session + last known DB state).
   */
  @Get(['customers/:id/network', 'api/customers/:id/network'])
  async getCustomerNetworkStatus(@Param('id') id: string) {
    return this.networkService.getCustomerNetworkStatus(id);
  }

  /**
   * POST /customers/:id/network/disconnect atau /api/customers/:id/network/disconnect
   * Memutus sesi PPPoE pelanggan dan menonaktifkan akun.
   */
  @Post(['customers/:id/network/disconnect', 'api/customers/:id/network/disconnect'])
  @HttpCode(HttpStatus.OK)
  async disconnectCustomer(@Param('id') id: string) {
    return this.networkService.disconnectCustomer(id);
  }

  /**
   * POST /customers/:id/network/reconnect atau /api/customers/:id/network/reconnect
   * Mengaktifkan kembali akun dan menghubungkan ulang sesi PPPoE pelanggan.
   */
  @Post(['customers/:id/network/reconnect', 'api/customers/:id/network/reconnect'])
  @HttpCode(HttpStatus.OK)
  async reconnectCustomer(@Param('id') id: string) {
    return this.networkService.reconnectCustomer(id);
  }

  /**
   * GET /routers/:id/status atau /api/routers/:id/status
   * Mengambil status router dan penggunaan resource sistem (CPU, RAM, Uptime).
   */
  @Get(['routers/:id/status', 'api/routers/:id/status'])
  async getRouterStatus(@Param('id') id: string) {
    return this.networkService.getRouterStatus(id);
  }
}
