/**
 * Tipe data untuk konfigurasi dan respons API RouterOS MikroTik
 */

export interface MikrotikConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  timeout?: number;
}

/**
 * Representasi raw session aktif dari `/ppp/active/print`
 */
export interface RouterOSActiveSession {
  '.id'?: string;
  name?: string;
  service?: string;
  'caller-id'?: string;
  address?: string;
  uptime?: string;
  'bytes-in'?: string;
  'bytes-out'?: string;
  comment?: string;
  session_id?: string;
  [key: string]: unknown;
}

/**
 * Representasi raw ppp secret dari `/ppp/secret/print`
 */
export interface RouterOSSecret {
  '.id'?: string;
  name?: string;
  service?: string;
  profile?: string;
  disabled?: string | boolean;
  comment?: string;
  [key: string]: unknown;
}

/**
 * Representasi raw system resource dari `/system/resource/print`
 */
export interface RouterOSSystemResource {
  uptime?: string;
  version?: string;
  'build-time'?: string;
  'free-memory'?: string | number;
  'total-memory'?: string | number;
  cpu?: string;
  'cpu-count'?: string | number;
  'cpu-frequency'?: string | number;
  'cpu-load'?: string | number;
  'free-hdd-space'?: string | number;
  'total-hdd-space'?: string | number;
  'architecture-name'?: string;
  'board-name'?: string;
  platform?: string;
  [key: string]: unknown;
}

/**
 * Representasi raw routerboard info dari `/system/routerboard/print`
 */
export interface RouterOSRouterboard {
  routerboard?: string;
  model?: string;
  'serial-number'?: string;
  'current-firmware'?: string;
  [key: string]: unknown;
}
