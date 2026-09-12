import { Injectable, LoggerService, ConsoleLogger } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends ConsoleLogger implements LoggerService {
  constructor() {
    super('Application');
  }

  log(message: any, context?: string): void {
    super.log(message, context);
  }

  error(message: any, stack?: string, context?: string): void {
    super.error(message, stack, context);
  }

  warn(message: any, context?: string): void {
    super.warn(message, context);
  }

  debug(message: any, context?: string): void {
    super.debug(message, context);
  }

  verbose(message: any, context?: string): void {
    super.verbose(message, context);
  }
}
