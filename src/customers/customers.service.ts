import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { eq, and, or, ilike, count } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../db/db.module.js';
import { customers, packages, routers, pppoeAccounts } from '../db/schema.js';
import type { Database } from '../db/index.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import type { UpdateCustomerDto } from './dto/update-customer.dto.js';
import type { SearchCustomerDto } from './dto/search-customer.dto.js';
import { PaginatedResponseDto } from '../common/dto/index.js';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: Database,
  ) {}

  /**
   * Buat pelanggan baru.
   * Juga otomatis membuat PPPoE account.
   */
  async create(dto: CreateCustomerDto) {
    // 1. Validasi package exists
    const [pkg] = await this.db
      .select()
      .from(packages)
      .where(eq(packages.id, dto.packageId))
      .limit(1);

    if (!pkg) {
      throw new NotFoundException(`Paket dengan ID "${dto.packageId}" tidak ditemukan`);
    }

    // 2. Validasi router exists
    const [router] = await this.db
      .select()
      .from(routers)
      .where(eq(routers.id, dto.routerId))
      .limit(1);

    if (!router) {
      throw new NotFoundException(`Router dengan ID "${dto.routerId}" tidak ditemukan`);
    }

    // 3. Generate PPPoE username jika tidak disediakan
    const pppoeUsername = dto.pppoeUsername || this.generatePPPoEUsername(dto.name);

    // 4. Cek PPPoE username unik
    const [existingPppoe] = await this.db
      .select()
      .from(pppoeAccounts)
      .where(eq(pppoeAccounts.username, pppoeUsername))
      .limit(1);

    if (existingPppoe) {
      throw new ConflictException(`PPPoE username "${pppoeUsername}" sudah digunakan`);
    }

    // 5. Insert customer
    const [customer] = await this.db
      .insert(customers)
      .values({
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        zone: dto.zone,
        packageId: dto.packageId,
        routerId: dto.routerId,
      })
      .returning();

    // 6. Insert PPPoE account
    const [pppoe] = await this.db
      .insert(pppoeAccounts)
      .values({
        username: pppoeUsername,
        customerId: customer!.id,
      })
      .returning();

    this.logger.log(`Customer created: ${customer!.id} (${dto.name})`);

    return {
      ...customer!,
      pppoeAccount: pppoe!,
    };
  }

  /**
   * Cari pelanggan dengan pagination, search, dan filter.
   */
  async findAll(query: SearchCustomerDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.phone, searchPattern),
          ilike(customers.address, searchPattern),
        ),
      );
    }

    if (query.status) {
      conditions.push(eq(customers.status, query.status));
    }

    if (query.serviceStatus) {
      conditions.push(eq(customers.serviceStatus, query.serviceStatus));
    }

    if (query.zone) {
      conditions.push(eq(customers.zone, query.zone));
    }

    if (query.packageId) {
      conditions.push(eq(customers.packageId, query.packageId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(whereClause);

    const totalItems = totalResult?.count ?? 0;

    // Fetch items with relations
    const items = await this.db.query.customers.findMany({
      where: whereClause,
      with: {
        package: true,
        router: true,
        pppoeAccount: true,
      },
      limit,
      offset,
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    return new PaginatedResponseDto(items, page, limit, totalItems);
  }

  /**
   * Dapatkan detail pelanggan berdasarkan ID.
   * Termasuk relasi: package, router, pppoeAccount, invoices, sessions.
   */
  async findOne(id: string) {
    const customer = await this.db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        package: true,
        router: true,
        pppoeAccount: true,
        invoices: true,
        sessions: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Pelanggan dengan ID "${id}" tidak ditemukan`);
    }

    return customer;
  }

  /**
   * Update data pelanggan.
   */
  async update(id: string, dto: UpdateCustomerDto) {
    // 1. Cek customer exists
    const [existing] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Pelanggan dengan ID "${id}" tidak ditemukan`);
    }

    // 2. Validasi package jika diubah
    if (dto.packageId) {
      const [pkg] = await this.db
        .select()
        .from(packages)
        .where(eq(packages.id, dto.packageId))
        .limit(1);

      if (!pkg) {
        throw new NotFoundException(`Paket dengan ID "${dto.packageId}" tidak ditemukan`);
      }
    }

    // 3. Validasi router jika diubah
    if (dto.routerId) {
      const [router] = await this.db
        .select()
        .from(routers)
        .where(eq(routers.id, dto.routerId))
        .limit(1);

      if (!router) {
        throw new NotFoundException(`Router dengan ID "${dto.routerId}" tidak ditemukan`);
      }
    }

    // 4. Update
    const [updated] = await this.db
      .update(customers)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    this.logger.log(`Customer updated: ${id}`);

    return updated;
  }

  /**
   * Deaktivasi pelanggan (soft delete).
   * Set status = INACTIVE, serviceStatus = TERMINATED.
   */
  async deactivate(id: string) {
    const [existing] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Pelanggan dengan ID "${id}" tidak ditemukan`);
    }

    const [deactivated] = await this.db
      .update(customers)
      .set({
        status: 'INACTIVE',
        serviceStatus: 'TERMINATED',
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    this.logger.log(`Customer deactivated: ${id}`);

    return deactivated;
  }

  /**
   * Generate PPPoE username dari nama pelanggan.
   * Contoh: "Budi Santoso" → "budi-santoso"
   */
  private generatePPPoEUsername(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
