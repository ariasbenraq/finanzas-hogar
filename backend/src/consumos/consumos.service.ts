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

  async diario(periodo: string) {
    const actual = await this.periodoActual();
    const esActual = periodo === actual;
    return this.cache(`diario:${periodo}`, esActual ? 60 : 86400, async () => {
      const { rows } = await this.pg.query(
        `WITH p AS (
           SELECT $1::date AS inicio,
                  LEAST(($1::date + INTERVAL '1 month')::date,
                        (now() AT TIME ZONE 'America/Lima')::date) AS ultimo
         ), base AS (
           SELECT (fecha AT TIME ZONE 'America/Lima')::date AS dia,
                  CASE WHEN fuente = 'tarjeta' THEN 'tarjeta' ELSE 'efectivo' END AS categoria,
                  moneda, monto
           FROM consumos
           WHERE periodo = $1::date AND fuente IN ('tarjeta', 'efectivo', 'yape', 'plin')
         ), series AS (
           SELECT DISTINCT categoria, moneda FROM base
         ), dias AS (
           SELECT d::date AS dia FROM p, generate_series(p.inicio, p.ultimo, INTERVAL '1 day') AS d
         ), agrupado AS (
           SELECT dia, categoria, moneda, SUM(monto) AS total, COUNT(*) AS n
           FROM base GROUP BY 1, 2, 3
         )
         SELECT s.categoria, s.moneda, d.dia::text AS dia,
                COALESCE(a.total, 0) AS total,
                COALESCE(a.n, 0)::int AS consumos,
                SUM(COALESCE(a.total, 0)) OVER (PARTITION BY s.categoria, s.moneda ORDER BY d.dia) AS acumulado
         FROM dias d CROSS JOIN series s
         LEFT JOIN agrupado a ON a.dia = d.dia AND a.categoria = s.categoria AND a.moneda = s.moneda
         ORDER BY s.categoria, s.moneda, d.dia`,
        [periodo],
      );

      const mapa = new Map<string, { categoria: string; moneda: string; puntos: any[] }>();
      for (const r of rows) {
        const k = `${r.categoria}|${r.moneda}`;
        if (!mapa.has(k)) mapa.set(k, { categoria: r.categoria, moneda: r.moneda, puntos: [] });
        mapa.get(k)!.puntos.push({
          dia: r.dia,
          total: Number(r.total),
          consumos: r.consumos,
          acumulado: Number(r.acumulado),
        });
      }
      return { periodo, actual: esActual, series: [...mapa.values()] };
    });
  }

  async movimientos(periodo: string, categoria: string | null, limit: number, offset: number) {
    const actual = await this.periodoActual();
    const esActual = periodo === actual;
    const key = `mov:${periodo}:${categoria ?? 'todas'}:${limit}:${offset}`;
    return this.cache(key, esActual ? 60 : 86400, async () => {
      const filtro = `c.periodo = $1::date
        AND c.fuente IN ('tarjeta', 'efectivo', 'yape', 'plin')
        AND ($2::text IS NULL
             OR (CASE WHEN c.fuente = 'tarjeta' THEN 'tarjeta' ELSE 'efectivo' END) = $2)`;
      const { rows } = await this.pg.query(
        `SELECT c.id,
                to_char(c.fecha AT TIME ZONE 'America/Lima', 'YYYY-MM-DD"T"HH24:MI') AS fecha_local,
                c.establecimiento, c.monto::float8 AS monto, c.moneda,
                CASE WHEN c.fuente = 'tarjeta' THEN 'tarjeta' ELSE 'efectivo' END AS categoria
         FROM consumos c
         WHERE ${filtro}
         ORDER BY c.fecha DESC, c.id DESC
         LIMIT $3 OFFSET $4`,
        [periodo, categoria, limit, offset],
      );
      const { rows: cuenta } = await this.pg.query(
        `SELECT COUNT(*)::int AS n FROM consumos c WHERE ${filtro}`,
        [periodo, categoria],
      );
      return { periodo, total: cuenta[0].n as number, limit, offset, items: rows };
    });
  }
}
