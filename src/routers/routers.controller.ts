import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RoutersService } from './routers.service.js';
import { CreateRouterDto, UpdateRouterDto } from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// Protected: Requires valid JWT and ADMIN role
@Controller('routers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RoutersController {
  constructor(private readonly routersService: RoutersService) {}

  /**
   * POST /routers
   * Tambah router baru.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRouterDto) {
    return this.routersService.create(dto);
  }

  /**
   * GET /routers
   * List semua router.
   */
  @Get()
  async findAll() {
    return this.routersService.findAll();
  }

  /**
   * GET /routers/:id
   * Detail satu router.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.routersService.findOne(id);
  }

  /**
   * PATCH /routers/:id
   * Update router.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRouterDto) {
    return this.routersService.update(id, dto);
  }
}
