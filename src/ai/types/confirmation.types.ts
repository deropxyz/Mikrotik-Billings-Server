export interface ConfirmationPending {
  /** Selalu true, menandakan AI perlu menampilkan dialog konfirmasi */
  requiresConfirmation: true;
  /** Token unik untuk mengidentifikasi aksi yang tertunda */
  confirmationToken: string;
  /** Nama aksi yang menunggu konfirmasi */
  action: 'DISCONNECT_CUSTOMER' | 'RECONNECT_CUSTOMER';
  /** Detail yang ditampilkan ke operator sebelum konfirmasi */
  details: {
    customerId: string;
    customerName: string;
    pppoeUsername: string;
    routerName: string;
  };
  /** Pesan konfirmasi yang harus ditampilkan operator */
  confirmationMessage: string;
  /** Waktu kadaluarsa token (ISO string) */
  expiresAt: string;
}
