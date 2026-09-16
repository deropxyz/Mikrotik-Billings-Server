import {
  Injectable,
  Inject,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { customers, pppoeAccounts, routers, networkSessions } from '../db/schema.js';
import {
  NETWORK_DEVICE_TOKEN,
  type NetworkDevice,
  type NetworkSession,
  type SystemResource,
} from './interfaces/network-device.interface.js';
import { AuditService } from '../audit/audit.service.js';

export interface DisconnectResult {
  success: boolean;
  customerId: string;
  username: string;
  message: string;
}

export interface ReconnectResult {
  success: boolean;
  customerId: string;
  username: string;
  message: string;
}

export interface CustomerNetworkStatus {
  customerId: string;
  username: string;
  isEnabled: boolean;
  liveSession: NetworkSession | null;
  lastKnownSession: typeof networkSessions.$inferSelect | null;
  router: {
    id: string;
    name: string;
    host: string;
  };
}

export interface RouterStatus {
  routerId: string;
  routerName: string;
  host: string;
  isActive: boolean;
  resource: SystemResource;
}

@Injectable()
export class NetworkService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: any,
    @Inject(NETWORK_DEVICE_TOKEN) private readonly adapter: NetworkDevice,
    private readonly auditService: AuditService,
  ) { }

  /**
   * Disconnect PPPoE session pelanggan dan nonaktifkan akun di database.
   */
  async disconnectCustomer(customerId: string): Promise<DisconnectResult> {
    const customerRes = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customerRes || customerRes.length === 0) {
      throw new NotFoundException(`Pelanggan dengan ID ${customerId} tidak ditemukan`);
    }

    const pppoeRes = await this.db
      .select()
      .from(pppoeAccounts)
      .where(eq(pppoeAccounts.customerId, customerId))
      .limit(1);

    if (!pppoeRes || pppoeRes.length === 0) {
      throw new NotFoundException(`Akun PPPoE untuk pelanggan ID ${customerId} tidak ditemukan`);
    }

    const pppoe = pppoeRes[0];
    const customer = customerRes[0];

    try {
      await this.adapter.disconnectPPPoE(pppoe.username);
    } catch (err) {
      await this.auditService.recordAuditLog({
        customerId,
        action: 'DISCONNECT_PPPOE',
        targetType: 'CUSTOMER',
        targetId: customerId,
        source: 'SYSTEM_API',
        request: { customerId, username: pppoe.username },
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw new ServiceUnavailableException(
        `Gagal menghubungi router: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }

    await this.db
      .update(pppoeAccounts)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(eq(pppoeAccounts.id, pppoe.id));

    const existingSession = await this.db
      .select()
      .from(networkSessions)
      .where(eq(networkSessions.customerId, customerId))
      .limit(1);

    const now = new Date();
    if (existingSession && existingSession.length > 0) {
      await this.db
        .update(networkSessions)
        .set({
          status: 'OFFLINE',
          disconnectedAt: now,
          updatedAt: now,
        })
        .where(eq(networkSessions.id, existingSession[0].id));
    } else {
      await this.db.insert(networkSessions).values({
        customerId,
        routerId: customer.routerId,
        username: pppoe.username,
        status: 'OFFLINE',
        disconnectedAt: now,
      });
    }

    await this.auditService.recordAuditLog({
      customerId,
      action: 'DISCONNECT_PPPOE',
      targetType: 'CUSTOMER',
      targetId: customerId,
      source: 'SYSTEM_API',
      request: { customerId },
      result: { username: pppoe.username },
      status: 'SUCCESS',
    });

    return {
      success: true,
      customerId,
      username: pppoe.username,
      message: `PPPoE session untuk ${pppoe.username} berhasil diputus`,
    };
  }

  /**
   * Reconnect PPPoE session pelanggan dan aktifkan akun di database.
   */
  async reconnectCustomer(customerId: string): Promise<ReconnectResult> {
    const customerRes = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customerRes || customerRes.length === 0) {
      throw new NotFoundException(`Pelanggan dengan ID ${customerId} tidak ditemukan`);
    }

    const pppoeRes = await this.db
      .select()
      .from(pppoeAccounts)
      .where(eq(pppoeAccounts.customerId, customerId))
      .limit(1);

    if (!pppoeRes || pppoeRes.length === 0) {
      throw new NotFoundException(`Akun PPPoE untuk pelanggan ID ${customerId} tidak ditemukan`);
    }

    const pppoe = pppoeRes[0];
    const customer = customerRes[0];

    try {
      await this.adapter.reconnectPPPoE(pppoe.username, pppoe.secretRef ?? undefined);
    } catch (err) {
      await this.auditService.recordAuditLog({
        customerId,
        action: 'RECONNECT_PPPOE',
        targetType: 'CUSTOMER',
        targetId: customerId,
        source: 'SYSTEM_API',
        request: { customerId, username: pppoe.username },
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw new ServiceUnavailableException(
        `Gagal menghubungi router: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }

    await this.db
      .update(pppoeAccounts)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(eq(pppoeAccounts.id, pppoe.id));

    const existingSession = await this.db
      .select()
      .from(networkSessions)
      .where(eq(networkSessions.customerId, customerId))
      .limit(1);

    const now = new Date();
    if (existingSession && existingSession.length > 0) {
      await this.db
        .update(networkSessions)
        .set({
          status: 'ONLINE',
          connectedAt: now,
          updatedAt: now,
        })
        .where(eq(networkSessions.id, existingSession[0].id));
    } else {
      await this.db.insert(networkSessions).values({
        customerId,
        routerId: customer.routerId,
        username: pppoe.username,
        status: 'ONLINE',
        connectedAt: now,
      });
    }

    await this.auditService.recordAuditLog({
      customerId,
      action: 'RECONNECT_PPPOE',
      targetType: 'CUSTOMER',
      targetId: customerId,
      source: 'SYSTEM_API',
      request: { customerId },
      result: { username: pppoe.username },
      status: 'SUCCESS',
    });

    return {
      success: true,
      customerId,
      username: pppoe.username,
      message: `PPPoE session untuk ${pppoe.username} berhasil diaktifkan kembali`,
    };
  }

  /**
   * Ambil status jaringan pelanggan (live session dari router + state dari DB).
   */
  async getCustomerNetworkStatus(customerId: string): Promise<CustomerNetworkStatus> {
    const customerRes = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customerRes || customerRes.length === 0) {
      throw new NotFoundException(`Pelanggan dengan ID ${customerId} tidak ditemukan`);
    }

    const pppoeRes = await this.db
      .select()
      .from(pppoeAccounts)
      .where(eq(pppoeAccounts.customerId, customerId))
      .limit(1);

    if (!pppoeRes || pppoeRes.length === 0) {
      throw new NotFoundException(`Akun PPPoE untuk pelanggan ID ${customerId} tidak ditemukan`);
    }

    const pppoe = pppoeRes[0];
    const customer = customerRes[0];

    let routerData = {
      id: customer.routerId,
      name: 'Unknown Router',
      host: '',
    };

    if (customer.routerId) {
      const routerRes = await this.db
        .select()
        .from(routers)
        .where(eq(routers.id, customer.routerId))
        .limit(1);

      if (routerRes && routerRes.length > 0) {
        routerData = {
          id: routerRes[0].id,
          name: routerRes[0].name,
          host: routerRes[0].host,
        };
      }
    }

    let liveSession: NetworkSession | null = null;
    try {
      liveSession = await this.adapter.getSessionByUsername(pppoe.username);
    } catch (err) {
      throw new ServiceUnavailableException(
        `Gagal menghubungi router: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }

    const sessionRes = await this.db
      .select()
      .from(networkSessions)
      .where(eq(networkSessions.customerId, customerId))
      .limit(1);

    const lastKnownSession = sessionRes && sessionRes.length > 0 ? sessionRes[0] : null;

    return {
      customerId,
      username: pppoe.username,
      isEnabled: pppoe.isEnabled,
      liveSession,
      lastKnownSession,
      router: routerData,
    };
  }

  /**
   * Ambil semua sesi aktif dari adapter / router.
   */
  async getActiveSessions(): Promise<NetworkSession[]> {
    try {
      return await this.adapter.getActiveSessions();
    } catch (err) {
      throw new ServiceUnavailableException(
        `Gagal menghubungi router: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Ambil status router dan resource CPU/Memory.
   */
  async getRouterStatus(routerId: string): Promise<RouterStatus> {
    const routerRes = await this.db
      .select()
      .from(routers)
      .where(eq(routers.id, routerId))
      .limit(1);

    if (!routerRes || routerRes.length === 0) {
      throw new NotFoundException(`Router dengan ID ${routerId} tidak ditemukan`);
    }

    const router = routerRes[0];

    let resource: SystemResource;
    try {
      resource = await this.adapter.getSystemResource();
    } catch (err) {
      throw new ServiceUnavailableException(
        `Gagal menghubungi router: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }

    return {
      routerId: router.id,
      routerName: router.name,
      host: router.host,
      isActive: router.isActive,
      resource,
    };
  }
}
