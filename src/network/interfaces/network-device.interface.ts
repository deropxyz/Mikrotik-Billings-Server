export interface NetworkSession {
  username: string;
  ipAddress: string;
  connectedAt: Date;
  lastSeenAt: Date;
  uptime: string; // format "3d 14h 22m"
  txBytes: number;
  rxBytes: number;
  routerId: string;
}

export interface SystemResource {
  routerId: string;
  cpuLoad: number; // persen (0-100)
  freeMemoryMb: number;
  totalMemoryMb: number;
  uptime: string;
  boardName: string;
  version: string;
  isOnline: boolean;
}

export interface NetworkDevice {
  disconnectPPPoE(username: string): Promise<void>;
  reconnectPPPoE(username: string, secretRef?: string): Promise<void>;
  getActiveSessions(): Promise<NetworkSession[]>;
  getSessionByUsername(username: string): Promise<NetworkSession | null>;
  getSystemResource(): Promise<SystemResource>;
}

export const NETWORK_DEVICE_TOKEN = 'NETWORK_DEVICE_TOKEN';
