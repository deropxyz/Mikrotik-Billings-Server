import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte, count, desc } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { auditLogs } from '../db/schema.js';
import { AuditFilterDto } from './dto/audit-filter.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';

export interface CreateAuditLogData {
  actorUserId?: string | null;
  customerId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  source: string;
  request?: unknown;
  result?: unknown;
  status: 'SUCCESS' | 'FAILED' | string;
  error?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: any,
  ) {}

  /**
   * Catat aktivitas/event ke tabel AuditLog (fire-and-forget).
   * Tidak akan melempar exception bila gagal agar tidak memutus alur utama.
   */
  async recordAuditLog(data: CreateAuditLogData): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        actorUserId: data.actorUserId ?? null,
        customerId: data.customerId ?? null,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        source: data.source,
        request: data.request ? JSON.parse(JSON.stringify(data.request)) : null,
        result: data.result ? JSON.parse(JSON.stringify(data.result)) : null,
        status: data.status,
        error: data.error ?? null,
      });
    } catch (err) {
      this.logger.error(
        `Gagal mencatat audit log [${data.action}] untuk target [${data.targetId}]: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Ambil daftar audit log dengan filter dan pagination.
   */
  async listAuditLogs(filter: AuditFilterDto) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Number(filter.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filter.action) {
      conditions.push(eq(auditLogs.action, filter.action));
    }
    if (filter.customerId) {
      conditions.push(eq(auditLogs.customerId, filter.customerId));
    }
    if (filter.status) {
      conditions.push(eq(auditLogs.status, filter.status));
    }
    if (filter.targetType) {
      conditions.push(eq(auditLogs.targetType, filter.targetType));
    }
    if (filter.dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(filter.dateFrom)));
    }
    if (filter.dateTo) {
      conditions.push(lte(auditLogs.createdAt, new Date(filter.dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);

    const totalItems = totalResult?.count ?? 0;

    // Ambil data items
    let items: any[] = [];
    if (this.db.query?.auditLogs?.findMany) {
      items = await this.db.query.auditLogs.findMany({
        where: whereClause,
        with: {
          actor: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          customer: {
            columns: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        limit,
        offset,
        orderBy: [desc(auditLogs.createdAt)],
      });
    } else {
      // Fallback direct select jika query relational tidak tersedia di mock DB
      const query = this.db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(auditLogs.createdAt));
      items = await query;
    }

    return new PaginatedResponseDto(items, page, limit, totalItems);
  }
}
