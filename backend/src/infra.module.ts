import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

export const PG = 'PG_POOL';
export const REDIS = 'REDIS';

@Global()
@Module({
  providers: [
    { provide: PG, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }) },
    { provide: REDIS, useFactory: () => new Redis(process.env.REDIS_URL as string) },
  ],
  exports: [PG, REDIS],
})
export class InfraModule {}
