import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { PG, REDIS } from './infra.module.js';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(PG) private pg: Pool,
    @Inject(REDIS) private redis: Redis,
  ) {}

  @Get()
  async check() {
    await this.pg.query('SELECT 1');
    await this.redis.ping();
    return { status: 'ok' };
  }
}

