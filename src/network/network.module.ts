import { Module, Logger } from '@nestjs/common';
import { NetworkService } from './network.service.js';
import { NetworkController } from './network.controller.js';
import { MockNetworkAdapter } from './adapters/mock/mock-network.adapter.js';
import { MikrotikAdapter } from './adapters/mikrotik/mikrotik.adapter.js';
import { NETWORK_DEVICE_TOKEN } from './interfaces/network-device.interface.js';
import { AuditModule } from '../audit/audit.module.js';

const driver = process.env['NETWORK_DRIVER'] ?? 'mock';
const logger = new Logger('NetworkModule');

if (driver === 'mikrotik') {
  logger.log('NETWORK_DRIVER=mikrotik aktif: menggunakan MikrotikAdapter.');
} else {
  logger.log(`NETWORK_DRIVER=${driver}: menggunakan MockNetworkAdapter.`);
}

const networkAdapterProvider = {
  provide: NETWORK_DEVICE_TOKEN,
  useClass: driver === 'mikrotik' ? MikrotikAdapter : MockNetworkAdapter,
};

@Module({
  imports: [AuditModule],
  controllers: [NetworkController],
  providers: [
    MockNetworkAdapter,
    MikrotikAdapter,
    networkAdapterProvider,
    NetworkService,
  ],
  exports: [NetworkService, NETWORK_DEVICE_TOKEN],
})
export class NetworkModule {}

