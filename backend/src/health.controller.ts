import { Controller, Get } from '@nestjs/common';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

@Controller('health')
export class HealthController {
  private pool = new Pool({ connectionString: process.env.DATABASE_URL });
  private redis = new Redis(process.env.REDIS_URL as string);

  @Get()
  async check() {
    const r = await this.pool.query('SELECT count(*)::int AS n FROM consumos');
    await this.redis.set('health', 'ok', 'EX', 10);
    return {
      db: 'ok',
      consumos: r.rows[0].n,
      redis: await this.redis.get('health'),
    };
  }
}
