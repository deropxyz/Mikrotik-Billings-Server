import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditFilterDto } from './dto/audit-filter.dto.js';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(['audit-logs', 'api/audit-logs'])
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async list(@Query() filter: AuditFilterDto) {
    return this.auditService.listAuditLogs(filter);
  }
}
