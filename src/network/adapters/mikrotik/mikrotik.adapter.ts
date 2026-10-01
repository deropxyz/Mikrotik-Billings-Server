import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { RouterOSAPI, Channel } from 'node-routeros';
import {
  NetworkDevice,
  NetworkSession,
  SystemResource,
} from '../../interfaces/network-device.interface.js';
import {
  MikrotikConfig,
  RouterOSActiveSession,
  RouterOSSecret,
  RouterOSSystemResource,
  RouterOSRouterboard,
} from './mikrotik.types.js';

export const MIKROTIK_CUSTOM_CONFIG = 'MIKROTIK_CUSTOM_CONFIG';

// RouterOS v7 compatibility fix:
// RouterOS v7 mengirimkan paket `!empty` ketika query print tidak memiliki hasil/kosong.
// node-routeros aslinya melempar RosException UNKNOWNREPLY untuk `!empty`.
// Patch ini memastikan paket `!empty` diabaikan sehingga menunggu paket penutup `!done` dengan array kosong ([]).
const originalProcessPacket = (Channel.prototype as any).processPacket;
if (originalProcessPacket) {
  (Channel.prototype as any).processPacket = function (packet: unknown[]) {
    if (Array.isArray(packet) && packet[0] === '!empty') {
      return;
    }
    return originalProcessPacket.call(this, packet);
  };
}

@Injectable()
export class MikrotikAdapter implements NetworkDevice {
  private readonly logger = new Logger(MikrotikAdapter.name);
  private customConfig?: Partial<MikrotikConfig>;

  constructor(
    @Optional()
    @Inject(MIKROTIK_CUSTOM_CONFIG)
    customConfig?: Partial<MikrotikConfig>,
  ) {
    this.customConfig = customConfig;
  }

  /**
   * Mengambil konfigurasi koneksi MikroTik dari env atau parameter konstruktor.
   */
  public getConfig(): MikrotikConfig {
    const host = this.customConfig?.host ?? process.env['MIKROTIK_HOST'] ?? '127.0.0.1';
    const port = Number(this.customConfig?.port ?? process.env['MIKROTIK_PORT'] ?? 8728);
    const user = this.customConfig?.user ?? process.env['MIKROTIK_USERNAME'] ?? 'admin';
    const password = this.customConfig?.password ?? process.env['MIKROTIK_PASSWORD'] ?? '';
    const timeout = Number(this.customConfig?.timeout ?? 5);

    return { host, port, user, password, timeout };
  }

  /**
   * Membuat instance client RouterOSAPI.
   * Dapat di-override atau dimock dalam unit test.
   */
  protected createClient(config: MikrotikConfig): RouterOSAPI {
    return new RouterOSAPI({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      timeout: config.timeout ?? 5,
    });
  }

  /**
   * Wrapper untuk mengeksekusi aksi API dengan manajemen lifecycle koneksi dan error handling terpusat.
   */
  private async executeWithClient<T>(
    action: (client: RouterOSAPI) => Promise<T>,
  ): Promise<T> {
    const config = this.getConfig();
    const client = this.createClient(config);

    try {
      try {
        await client.connect();
      } catch (err) {
        throw this.createConnectionError(err, config);
      }

      try {
        return await action(client);
      } catch (err) {
        throw this.createExecutionError(err);
      }
    } finally {
      try {
        await client.close();
      } catch {
        // Abaikan error saat menutup koneksi
      }
    }
  }

  /**
   * Penanganan error koneksi & otentikasi.
   */
  private createConnectionError(err: unknown, config: MikrotikConfig): Error {
    const msg = err instanceof Error ? err.message : String(err);
    this.logger.error(`Gagal menghubungkan ke MikroTik (${config.host}:${config.port}): ${msg}`);

    if (
      msg.includes('CANTLOGIN') ||
      msg.toLowerCase().includes('invalid user') ||
      msg.toLowerCase().includes('cannot log in')
    ) {
      return new Error(
        `Autentikasi MikroTik gagal: periksa MIKROTIK_USERNAME dan MIKROTIK_PASSWORD pada ${config.host}`,
      );
    }

    if (msg.includes('ECONNREFUSED')) {
      return new Error(
        `Koneksi ditolak (${config.host}:${config.port}): pastikan API service aktif di router MikroTik`,
      );
    }

    if (msg.includes('ETIMEDOUT') || msg.toLowerCase().includes('timeout')) {
      return new Error(
        `Koneksi ke MikroTik (${config.host}:${config.port}) timeout: host tidak dapat dijangkau`,
      );
    }

    return new Error(`Gagal terhubung ke router MikroTik: ${msg}`);
  }

  /**
   * Penanganan error saat perintah API dijalankan.
   */
  private createExecutionError(err: unknown): Error {
    const msg = err instanceof Error ? err.message : String(err);
    this.logger.error(`Error saat menjalankan perintah di MikroTik: ${msg}`);
    return new Error(`MikroTik API error: ${msg}`);
  }

  /**
   * Memutuskan sesi PPPoE aktif dari username tertentu.
   */
  async disconnectPPPoE(username: string): Promise<void> {
    await this.executeWithClient(async (client) => {
      const activeSessions = (await client.write([
        '/ppp/active/print',
        `?name=${username}`,
      ])) as RouterOSActiveSession[];

      if (!activeSessions || activeSessions.length === 0) {
        this.logger.warn(`Tidak ditemukan sesi aktif PPPoE untuk user: ${username}`);
        return;
      }

      for (const session of activeSessions) {
        if (session['.id']) {
          this.logger.log(
            `Menghapus active session PPPoE: ${username} (id: ${session['.id']})`,
          );
          await client.write(['/ppp/active/remove', `=.id=${session['.id']}`]);
        }
      }
    });
  }

  /**
   * Mengaktifkan kembali PPPoE secret dan menghapus sesi nyangkut jika ada.
   */
  async reconnectPPPoE(username: string, _secretRef?: string): Promise<void> {
    await this.executeWithClient(async (client) => {
      // 1. Enable PPPoE secret
      const secrets = (await client.write([
        '/ppp/secret/print',
        `?name=${username}`,
      ])) as RouterOSSecret[];

      if (secrets && secrets.length > 0 && secrets[0]['.id']) {
        const secretId = secrets[0]['.id'];
        this.logger.log(`Mengaktifkan secret PPPoE untuk user: ${username} (id: ${secretId})`);
        await client.write(['/ppp/secret/set', `=.id=${secretId}`, '=disabled=no']);
      } else {
        this.logger.warn(`Secret PPPoE tidak ditemukan untuk user: ${username}`);
      }

      // 2. Putuskan sesi lama agar router meminta re-dial
      const activeSessions = (await client.write([
        '/ppp/active/print',
        `?name=${username}`,
      ])) as RouterOSActiveSession[];

      for (const session of activeSessions) {
        if (session['.id']) {
          await client.write(['/ppp/active/remove', `=.id=${session['.id']}`]);
        }
      }
    });
  }

  /**
   * Mengambil seluruh sesi PPPoE yang sedang aktif di router.
   */
  async getActiveSessions(): Promise<NetworkSession[]> {
    return this.executeWithClient(async (client) => {
      const activeSessions = (await client.write(
        '/ppp/active/print',
      )) as RouterOSActiveSession[];

      const routerId = this.getConfig().host;
      return (activeSessions || []).map((item) =>
        this.mapToNetworkSession(item, routerId),
      );
    });
  }

  /**
   * Mencari detail sesi aktif berdasarkan username.
   */
  async getSessionByUsername(username: string): Promise<NetworkSession | null> {
    return this.executeWithClient(async (client) => {
      const activeSessions = (await client.write([
        '/ppp/active/print',
        `?name=${username}`,
      ])) as RouterOSActiveSession[];

      if (!activeSessions || activeSessions.length === 0) {
        return null;
      }

      const routerId = this.getConfig().host;
      return this.mapToNetworkSession(activeSessions[0], routerId);
    });
  }

  /**
   * Mengambil informasi resource router (CPU load, memory, uptime, version).
   */
  async getSystemResource(): Promise<SystemResource> {
    return this.executeWithClient(async (client) => {
      const resources = (await client.write(
        '/system/resource/print',
      )) as RouterOSSystemResource[];

      const res = resources && resources.length > 0 ? resources[0] : {};
      let boardName = (res['board-name'] as string) || '';

      if (!boardName) {
        try {
          const rbList = (await client.write(
            '/system/routerboard/print',
          )) as RouterOSRouterboard[];
          if (rbList && rbList.length > 0 && rbList[0].model) {
            boardName = rbList[0].model;
          }
        } catch {
          // Abaikan jika bukan routerboard fisik (misalnya MikroTik CHR atau x86)
        }
      }

      const freeMem = Number(res['free-memory'] ?? 0);
      const totalMem = Number(res['total-memory'] ?? 0);
      const cpuLoad = parseInt(String(res['cpu-load'] ?? 0), 10);

      return {
        routerId: this.getConfig().host,
        cpuLoad: isNaN(cpuLoad) ? 0 : cpuLoad,
        freeMemoryMb: Math.round(freeMem / (1024 * 1024)),
        totalMemoryMb: Math.round(totalMem / (1024 * 1024)),
        uptime: (res.uptime as string) || '0s',
        boardName: boardName || 'MikroTik Router',
        version: (res.version as string) || 'RouterOS',
        isOnline: true,
      };
    });
  }

  /**
   * Mengubah data raw MikroTik active session menjadi interface NetworkSession.
   */
  private mapToNetworkSession(
    raw: RouterOSActiveSession,
    routerId: string,
  ): NetworkSession {
    const uptimeStr = raw.uptime || '0s';
    const durationMs = this.parseUptimeToMs(uptimeStr);
    const now = new Date();
    const connectedAt = new Date(now.getTime() - durationMs);

    return {
      username: raw.name || 'unknown',
      ipAddress: raw.address || '0.0.0.0',
      connectedAt,
      lastSeenAt: now,
      uptime: uptimeStr,
      txBytes: Number(raw['bytes-out'] || 0),
      rxBytes: Number(raw['bytes-in'] || 0),
      routerId,
    };
  }

  /**
   * Parser uptime MikroTik string ke milliseconds.
   * Contoh: "2w3d14h22m10s" atau "02:15:30".
   */
  private parseUptimeToMs(uptimeStr: string): number {
    let totalMs = 0;
    const weeks = uptimeStr.match(/(\d+)w/);
    const days = uptimeStr.match(/(\d+)d/);
    const hours = uptimeStr.match(/(\d+)h/);
    const minutes = uptimeStr.match(/(\d+)m(?!s)/);
    const seconds = uptimeStr.match(/(\d+)s/);

    if (weeks) totalMs += parseInt(weeks[1], 10) * 7 * 24 * 3600 * 1000;
    if (days) totalMs += parseInt(days[1], 10) * 24 * 3600 * 1000;
    if (hours) totalMs += parseInt(hours[1], 10) * 3600 * 1000;
    if (minutes) totalMs += parseInt(minutes[1], 10) * 60 * 1000;
    if (seconds) totalMs += parseInt(seconds[1], 10) * 1000;

    if (totalMs === 0 && uptimeStr.includes(':')) {
      const parts = uptimeStr.split(':').map((p) => parseInt(p, 10));
      if (parts.length === 3) {
        totalMs += (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      } else if (parts.length === 2) {
        totalMs += (parts[0] * 60 + parts[1]) * 1000;
      }
    }

    return totalMs;
  }
}
