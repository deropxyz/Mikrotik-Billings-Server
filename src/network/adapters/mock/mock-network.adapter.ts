import { Injectable } from '@nestjs/common';
import {
  NetworkDevice,
  NetworkSession,
  SystemResource,
} from '../../interfaces/network-device.interface.js';

@Injectable()
export class MockNetworkAdapter implements NetworkDevice {
  public simulateFailure: boolean = false;
  private readonly activeSessions = new Map<string, NetworkSession>();
  private readonly disconnectedUsers = new Set<string>();

  constructor() {
    this.seedSessions();
  }

  private seedSessions(): void {
    const seeds: NetworkSession[] = [
      {
        username: 'pelanggan1',
        ipAddress: '10.10.20.101',
        connectedAt: new Date(Date.now() - 2 * 86400000 - 5 * 3600000),
        lastSeenAt: new Date(),
        uptime: '2d 5h 30m',
        txBytes: 104857600,
        rxBytes: 524288000,
        routerId: 'mock-router',
      },
      {
        username: 'pelanggan2',
        ipAddress: '10.10.20.102',
        connectedAt: new Date(Date.now() - 3 * 3600000 - 15 * 60000),
        lastSeenAt: new Date(),
        uptime: '0d 3h 15m',
        txBytes: 20485760,
        rxBytes: 102428800,
        routerId: 'mock-router',
      },
      {
        username: 'pelanggan3',
        ipAddress: '10.10.20.103',
        connectedAt: new Date(Date.now() - 5 * 86400000 - 12 * 3600000),
        lastSeenAt: new Date(),
        uptime: '5d 12h 0m',
        txBytes: 524288000,
        rxBytes: 2147483648,
        routerId: 'mock-router',
      },
    ];

    for (const session of seeds) {
      this.activeSessions.set(session.username, session);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private checkFailure(): void {
    if (this.simulateFailure) {
      throw new Error('Router tidak dapat dijangkau (simulasi)');
    }
  }

  async disconnectPPPoE(username: string): Promise<void> {
    this.checkFailure();
    await this.sleep(300);
    this.activeSessions.delete(username);
    this.disconnectedUsers.add(username);
  }

  async reconnectPPPoE(username: string, _secretRef?: string): Promise<void> {
    this.checkFailure();
    await this.sleep(500);
    this.disconnectedUsers.delete(username);
    const randomHost = Math.floor(Math.random() * 150) + 100;
    this.activeSessions.set(username, {
      username,
      ipAddress: `10.10.20.${randomHost}`,
      connectedAt: new Date(),
      lastSeenAt: new Date(),
      uptime: '0d 0h 0m',
      txBytes: 0,
      rxBytes: 0,
      routerId: 'mock-router',
    });
  }

  async getActiveSessions(): Promise<NetworkSession[]> {
    this.checkFailure();
    await this.sleep(200);
    return Array.from(this.activeSessions.values());
  }

  async getSessionByUsername(username: string): Promise<NetworkSession | null> {
    this.checkFailure();
    return this.activeSessions.get(username) ?? null;
  }

  async getSystemResource(): Promise<SystemResource> {
    this.checkFailure();
    return {
      routerId: 'mock-router',
      cpuLoad: Math.floor(Math.random() * 30) + 5,
      freeMemoryMb: 128,
      totalMemoryMb: 256,
      uptime: '15d 7h 42m',
      boardName: 'RB750Gr3 (Mock)',
      version: '7.11 (stable) [MOCK]',
      isOnline: true,
    };
  }
}
