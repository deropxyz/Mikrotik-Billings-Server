import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditFilterDto } from './dto/audit-filter.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// Protected: Requires valid JWT and ADMIN role
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit-logs atau /api/audit-logs
   * List aktivitas dengan filter (action, source, date range, customerId)
   */
  @Get(['audit-logs', 'api/audit-logs'])
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async list(@Query() filter: AuditFilterDto) {
    return this.auditService.listAuditLogs(filter);
  }

  /**
   * GET /audit-logs/:id atau /api/audit-logs/:id
   * Detail log aktivitas spesifik
   */
  @Get(['audit-logs/:id', 'api/audit-logs/:id'])
  async getOne(@Param('id') id: string) {
    return this.auditService.getAuditLogById(id);
  }
}
