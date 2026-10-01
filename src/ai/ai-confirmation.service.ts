import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { NetworkService } from '../network/network.service.js';
import { AuditService } from '../audit/audit.service.js';

export interface PendingAction {
  action: 'DISCONNECT_CUSTOMER' | 'RECONNECT_CUSTOMER';
  customerId: string;
  userId: string;
  createdAt: Date;
}

@Injectable()
export class AIConfirmationService {
  private readonly logger = new Logger(AIConfirmationService.name);

  /**
   * In-memory store: token -> PendingAction
   * Catatan: jika server restart, semua pending action hilang.
   * Cukup untuk saat ini dan dapat diganti Redis di iterasi berikutnya.
   */
  private readonly pendingActions = new Map<string, PendingAction>();

  /** Durasi token berlaku dalam milidetik (default: 2 menit) */
  private readonly TOKEN_TTL_MS = 2 * 60 * 1000;

  constructor(
    private readonly networkService: NetworkService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Simpan aksi menunggu konfirmasi dan kembalikan token unik.
   */
  createPendingAction(
    action: PendingAction['action'],
    customerId: string,
    userId: string,
  ): string {
    const token = randomUUID();
    this.pendingActions.set(token, {
      action,
      customerId,
      userId,
      createdAt: new Date(),
    });
    // Bersihkan token otomatis setelah TTL
    setTimeout(() => this.pendingActions.delete(token), this.TOKEN_TTL_MS);
    return token;
  }

  /**
   * Eksekusi aksi berdasarkan token konfirmasi.
   * Lempar error jika token tidak ditemukan atau sudah kadaluarsa.
   */
  async executeConfirmedAction(token: string): Promise<string> {
    const pending = this.pendingActions.get(token);

    if (!pending) {
      return 'Token konfirmasi tidak ditemukan atau sudah kadaluarsa. Silakan ulangi permintaan aksi.';
    }

    // Hapus token agar tidak bisa dieksekusi dua kali (idempoten)
    this.pendingActions.delete(token);

    // Cek apakah token sudah melewati TTL (double-check)
    const elapsed = Date.now() - pending.createdAt.getTime();
    if (elapsed > this.TOKEN_TTL_MS) {
      return 'Token konfirmasi sudah kadaluarsa. Silakan ulangi permintaan aksi.';
    }

    try {
      if (pending.action === 'DISCONNECT_CUSTOMER') {
        const result = await this.networkService.disconnectCustomer(pending.customerId);
        await this.auditService.recordAuditLog({
          actorUserId: pending.userId,
          customerId: pending.customerId,
          action: 'AI_DISCONNECT_CUSTOMER',
          targetType: 'CUSTOMER',
          targetId: pending.customerId,
          source: 'AI_CHAT',
          result: { username: result.username },
          status: 'SUCCESS',
        });
        return `✅ Koneksi pelanggan (PPPoE: ${result.username}) berhasil diputus.`;
      }

      if (pending.action === 'RECONNECT_CUSTOMER') {
        const result = await this.networkService.reconnectCustomer(pending.customerId);
        await this.auditService.recordAuditLog({
          actorUserId: pending.userId,
          customerId: pending.customerId,
          action: 'AI_RECONNECT_CUSTOMER',
          targetType: 'CUSTOMER',
          targetId: pending.customerId,
          source: 'AI_CHAT',
          result: { username: result.username },
          status: 'SUCCESS',
        });
        return `✅ Koneksi pelanggan (PPPoE: ${result.username}) berhasil diaktifkan kembali.`;
      }

      return 'Aksi tidak dikenali.';
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      await this.auditService.recordAuditLog({
        actorUserId: pending.userId,
        customerId: pending.customerId,
        action: `AI_${pending.action}`,
        targetType: 'CUSTOMER',
        targetId: pending.customerId,
        source: 'AI_CHAT',
        status: 'FAILED',
        error: errMsg,
      });
      this.logger.error(`Gagal mengeksekusi aksi ${pending.action}: ${errMsg}`);
      return `❌ Gagal mengeksekusi aksi: ${errMsg}. Silakan coba lagi atau hubungi teknisi.`;
    }
  }
}
