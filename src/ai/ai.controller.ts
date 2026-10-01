import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AIService } from './ai.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';

// Protected: Requires valid JWT and ADMIN role, rate-limited to 20 req/min
@Controller(['ai', 'api/ai'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * POST /api/ai/chat atau /ai/chat
   * Body: { "message": "Siapa yang belum bayar?" }
   * Response: { "reply": "Ada 5 pelanggan yang belum membayar..." }
   */
  @Post('chat')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async chat(
    @Body() dto: ChatRequestDto,
    @Request() req: { user?: { sub: string; role?: string } },
  ) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Akses ditolak: Hanya ADMIN yang dapat menggunakan AI Chat');
    }
    const userId = req.user?.sub ?? 'operator';
    const reply = await this.aiService.processChat(userId, dto.message, dto.history, req.user?.role);
    return { reply };
  }
}
