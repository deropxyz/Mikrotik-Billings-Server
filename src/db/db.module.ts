import { Module, Global } from '@nestjs/common';
import { db } from './index.js';

export const DRIZZLE_TOKEN = 'DRIZZLE';

/** @deprecated Gunakan DRIZZLE_TOKEN */
export const DATABASE_TOKEN = DRIZZLE_TOKEN;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_TOKEN,
      useValue: db,
    },
  ],
  exports: [DRIZZLE_TOKEN],
})
export class DrizzleModule {}

/** @deprecated Gunakan DrizzleModule */
export const DatabaseModule = DrizzleModule;
