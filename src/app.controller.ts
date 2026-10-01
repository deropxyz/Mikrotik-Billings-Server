import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

// Public: Root health check endpoint - no JWT required
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
