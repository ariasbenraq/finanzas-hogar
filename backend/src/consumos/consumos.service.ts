import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { PG, REDIS } from '../infra.module.js';

const PRIMER_PERIODO_COMPLETO = '2025-12-25';
const SQL_ACTUAL = `(date_trunc('month', (now() AT TIME ZONE 'America/Lima') - interval '24 days 21 hours') + interval '24 days')::date::text`;

@Injectable()
export class ConsumosService {
  constructor(
    @Inject(PG) private pg: Pool,
    @Inject(REDIS) private redis: Redis,
  ) {}

  private async cache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const val = await fn();
    await this.redis.set(key, JSON.stringify(val), 'EX', ttl);
    return val;
  }

  async periodoActual(): Promise<string> {
    const { rows } = await this.pg.query(`SELECT ${SQL_ACTUAL} AS actual`);
    return rows[0].actual as string;
  }

  async periodos() {
    const actual = await this.periodoActual();
    return this.cache('periodos', 60, async () => {
      const { rows } = await this.pg.query(
        `SELECT periodo::text AS periodo, COUNT(*)::int AS consumos
         FROM consumos GROUP BY periodo ORDER BY periodo DESC`,
      );
      const lista = rows.map((r) => ({
        periodo: r.periodo as string,
        consumos: r.consumos as number,
        actual: r.periodo === actual,
        parcial: r.periodo < PRIMER_PERIODO_COMPLETO,
      }));
      if (!lista.some((p) => p.actual)) {
        lista.unshift({ periodo: actual, consumos: 0, actual: true, parcial: false });
      }
      return lista;
    });
  }

  async resumen(periodo: string) {
    const actual = await this.periodoActual();
    const esActual = periodo === actual;
    return this.cache(`resumen:${periodo}`, esActual ? 60 : 86400, async () => {
      const { rows } = await this.pg.query(
        `WITH p AS (
           SELECT $1::date AS inicio, ($1::date + INTERVAL '1 month')::date AS fin
         ), hoy AS (
           SELECT (now() AT TIME ZONE 'America/Lima')::date AS d
         ), base AS (
           SELECT CASE WHEN fuente = 'tarjeta' THEN 'tarjeta' ELSE 'efectivo' END AS categoria,
                  moneda, monto
           FROM consumos
           WHERE periodo = $1::date AND fuente IN ('tarjeta', 'efectivo', 'yape', 'plin')
         )
         SELECT b.categoria, b.moneda,
                COUNT(*)::int AS consumos,
                ROUND(SUM(b.monto), 2) AS total,
                (p.fin - p.inicio) AS dias_periodo,
                GREATEST(1, LEAST(hoy.d, p.fin - 1) - p.inicio + 1) AS dias_transcurridos
         FROM base b, p, hoy
         GROUP BY b.categoria, b.moneda, p.inicio, p.fin, hoy.d
         ORDER BY b.categoria, b.moneda`,
        [periodo],
      );

      const res: Record<string, any[]> = { tarjeta: [], efectivo: [] };
      for (const r of rows) {
        const total = Number(r.total);
        const diasPeriodo = Number(r.dias_periodo);
        const diasTranscurridos = Number(r.dias_transcurridos);
        const promedio = total / diasTranscurridos;
        res[r.categoria].push({
          moneda: r.moneda,
          consumos: r.consumos,
          total,
          promedio_diario: Math.round(promedio * 100) / 100,
          proyeccion: esActual ? Math.round(promedio * diasPeriodo * 100) / 100 : total,
          dias_periodo: diasPeriodo,
          dias_transcurridos: diasTranscurridos,
        });
      }
      return { periodo, actual: esActual, ...res };
    });
  }
}
