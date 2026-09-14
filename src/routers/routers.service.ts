import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { eq, and, ne, asc } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { routers } from '../db/schema.js';
import type { Database } from '../db/index.js';
import type { CreateRouterDto, UpdateRouterDto } from './dto/index.js';

@Injectable()
export class RoutersService {
  private readonly logger = new Logger(RoutersService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: Database,
  ) {}

  /**
   * Tambah router baru.
   */
  async create(dto: CreateRouterDto) {
    const [existing] = await this.db
      .select()
      .from(routers)
      .where(eq(routers.host, dto.host))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Host/IP router "${dto.host}" sudah digunakan`);
    }

    const [created] = await this.db
      .insert(routers)
      .values({
        name: dto.name,
        model: dto.model,
        routerOsVersion: dto.routerOsVersion,
        host: dto.host,
        ...(dto.apiPort !== undefined ? { apiPort: dto.apiPort } : {}),
      })
      .returning();

    this.logger.log(`Router created: ${created!.id} (${dto.name} - ${dto.host})`);
    return created!;
  }

  /**
   * Ambil semua data router.
   */
  async findAll() {
    return this.db
      .select()
      .from(routers)
      .orderBy(asc(routers.name));
  }

  /**
   * Ambil detail router berdasarkan ID.
   */
  async findOne(id: string) {
    const [router] = await this.db
      .select()
      .from(routers)
      .where(eq(routers.id, id))
      .limit(1);

    if (!router) {
      throw new NotFoundException(`Router dengan ID "${id}" tidak ditemukan`);
    }

    return router;
  }

  /**
   * Update data router.
   */
  async update(id: string, dto: UpdateRouterDto) {
    const [existing] = await this.db
      .select()
      .from(routers)
      .where(eq(routers.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Router dengan ID "${id}" tidak ditemukan`);
    }

    if (dto.host && dto.host !== existing.host) {
      const [duplicate] = await this.db
        .select()
        .from(routers)
        .where(and(eq(routers.host, dto.host), ne(routers.id, id)))
        .limit(1);

      if (duplicate) {
        throw new ConflictException(`Host/IP router "${dto.host}" sudah digunakan`);
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.model !== undefined) updateData.model = dto.model;
    if (dto.routerOsVersion !== undefined) updateData.routerOsVersion = dto.routerOsVersion;
    if (dto.host !== undefined) updateData.host = dto.host;
    if (dto.apiPort !== undefined) updateData.apiPort = dto.apiPort;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const [updated] = await this.db
      .update(routers)
      .set(updateData)
      .where(eq(routers.id, id))
      .returning();

    this.logger.log(`Router updated: ${id}`);
    return updated!;
  }
}
