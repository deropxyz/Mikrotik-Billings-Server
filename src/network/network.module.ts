import { Module, Logger } from '@nestjs/common';
import { NetworkService } from './network.service.js';
import { NetworkController } from './network.controller.js';
import { MockNetworkAdapter } from './adapters/mock/mock-network.adapter.js';
import { NETWORK_DEVICE_TOKEN } from './interfaces/network-device.interface.js';
import { AuditModule } from '../audit/audit.module.js';

const driver = process.env['NETWORK_DRIVER'] ?? 'mock';

if (driver === 'mikrotik') {
  const logger = new Logger('NetworkModule');
  logger.warn(
    'NETWORK_DRIVER=mikrotik dikonfigurasi tetapi implementasi live MikroTik belum tersedia. Menggunakan MockNetworkAdapter sebagai fallback.',
  );
}

const networkAdapterProvider = {
  provide: NETWORK_DEVICE_TOKEN,
  useClass: MockNetworkAdapter,
};

@Module({
  imports: [AuditModule],
  controllers: [NetworkController],
  providers: [
    networkAdapterProvider,
    NetworkService,
  ],
  exports: [NetworkService, NETWORK_DEVICE_TOKEN],
})
export class NetworkModule {}
