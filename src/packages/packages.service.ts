import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { eq, and, ne, asc } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { packages } from '../db/schema.js';
import type { Database } from '../db/index.js';
import type { CreatePackageDto, UpdatePackageDto } from './dto/index.js';

@Injectable()
export class PackagesService {
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: Database,
  ) {}

  /**
   * Buat paket internet baru.
   */
  async create(dto: CreatePackageDto) {
    const [existing] = await this.db
      .select()
      .from(packages)
      .where(eq(packages.name, dto.name))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Nama paket "${dto.name}" sudah digunakan`);
    }

    const [created] = await this.db
      .insert(packages)
      .values({
        name: dto.name,
        speedMbps: dto.speedMbps,
        monthlyPrice: String(dto.monthlyPrice),
      })
      .returning();

    this.logger.log(`Package created: ${created!.id} (${dto.name})`);
    return created!;
  }

  /**
   * Ambil semua paket aktif.
   */
  async findAll() {
    return this.db
      .select()
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(asc(packages.speedMbps));
  }

  /**
   * Ambil detail satu paket berdasarkan ID.
   */
  async findOne(id: string) {
    const [pkg] = await this.db
      .select()
      .from(packages)
      .where(eq(packages.id, id))
      .limit(1);

    if (!pkg) {
      throw new NotFoundException(`Paket dengan ID "${id}" tidak ditemukan`);
    }

    return pkg;
  }

  /**
   * Update data paket.
   */
  async update(id: string, dto: UpdatePackageDto) {
    const [existing] = await this.db
      .select()
      .from(packages)
      .where(eq(packages.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Paket dengan ID "${id}" tidak ditemukan`);
    }

    if (dto.name && dto.name !== existing.name) {
      const [duplicate] = await this.db
        .select()
        .from(packages)
        .where(and(eq(packages.name, dto.name), ne(packages.id, id)))
        .limit(1);

      if (duplicate) {
        throw new ConflictException(`Nama paket "${dto.name}" sudah digunakan`);
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.speedMbps !== undefined) updateData.speedMbps = dto.speedMbps;
    if (dto.monthlyPrice !== undefined) updateData.monthlyPrice = String(dto.monthlyPrice);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const [updated] = await this.db
      .update(packages)
      .set(updateData)
      .where(eq(packages.id, id))
      .returning();

    this.logger.log(`Package updated: ${id}`);
    return updated!;
  }

  /**
   * Soft delete paket (isActive = false).
   */
  async remove(id: string) {
    const [existing] = await this.db
      .select()
      .from(packages)
      .where(eq(packages.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Paket dengan ID "${id}" tidak ditemukan`);
    }

    const [deleted] = await this.db
      .update(packages)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(packages.id, id))
      .returning();

    this.logger.log(`Package soft-deleted: ${id}`);
    return deleted!;
  }
}
