import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/index.js';
import { ResponseInterceptor } from './interceptors/index.js';
import { AppLoggerService } from './services/index.js';

@Global()
@Module({
  providers: [
    AppLoggerService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [AppLoggerService],
})
export class CommonModule {}
