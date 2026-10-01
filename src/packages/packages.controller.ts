import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PackagesService } from './packages.service.js';
import { CreatePackageDto, UpdatePackageDto } from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// Protected: Requires valid JWT and ADMIN role
@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  /**
   * POST /packages
   * Buat paket baru.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  /**
   * GET /packages
   * List semua paket aktif.
   */
  @Get()
  async findAll() {
    return this.packagesService.findAll();
  }

  /**
   * GET /packages/:id
   * Detail satu paket.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  /**
   * PATCH /packages/:id
   * Update paket.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  /**
   * DELETE /packages/:id
   * Soft-delete paket (isActive = false).
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.packagesService.remove(id);
  }
}
