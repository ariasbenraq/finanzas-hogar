import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { PG, REDIS } from '../infra.module.js';

const PRIMER_PERIODO_COMPLETO = '2025-12-25';
const SQL_ACTUAL = `(date_trunc('month', (now() AT TIME ZONE 'America/Lima') - interval '24 days 21 hours') + interval '24 days')::date::text`;
const SQL_HOY = `(now() AT TIME ZONE 'America/Lima')::date::text`;

// Días enteros entre dos fechas ISO (YYYY-MM-DD), en UTC para no depender de la zona local.
function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

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

  // Ciclo real de facturación de un periodo, con los días del ciclo y los que faltan.
  private async cicloConDias(periodo: string, esActual: boolean) {
    const [{ rows }, { rows: hoyRows }] = await Promise.all([
      this.pg.query(
        `SELECT to_char(inicio, 'YYYY-MM-DD') AS inicio,
                to_char(cierre, 'YYYY-MM-DD') AS cierre,
                to_char(pago, 'YYYY-MM-DD') AS pago
         FROM app.ciclos WHERE periodo = $1::date`,
        [periodo],
      ),
      this.pg.query(`SELECT ${SQL_HOY} AS hoy`),
    ]);
    const hoy = hoyRows[0].hoy as string;
    const inicio = (rows[0]?.inicio as string) ?? periodo;
    const cierre = (rows[0]?.cierre as string) ?? periodo;
    const pago = (rows[0]?.pago as string) ?? null;
    const diasCiclo = Math.max(1, diasEntre(inicio, cierre) + 1);
    const transcurridos = Math.min(Math.max(1, diasEntre(inicio, hoy) + 1), diasCiclo);
    return {
      inicio,
      cierre,
      pago,
      dias_ciclo: diasCiclo,
      dias_transcurridos: transcurridos,
      dias_para_pago: pago ? Math.max(0, diasEntre(hoy, pago)) : null,
      cerrado: !esActual || diasEntre(hoy, cierre) < 0,
    };
  }

  // Presupuesto mensual de la tarjeta en soles frente a lo gastado/proyectado del periodo.
  private async presupuesto(tarjeta: any[]) {
    const { rows } = await this.pg.query(
      `SELECT valor::float8 AS monto FROM app.config WHERE clave = 'presupuesto_tarjeta_soles'`,
    );
    const monto = rows[0] ? Number(rows[0].monto) : null;
    const linea = tarjeta.find((l) => l.moneda === 'S');
    const gastado = linea ? linea.total : 0;
    const proyeccion = linea ? linea.proyeccion : 0;
    return {
      moneda: 'S',
      monto,
      gastado,
      porcentaje: monto ? redondear((gastado / monto) * 100) : null,
      proyeccion,
      excedido: monto != null && proyeccion > monto,
    };
  }

  async resumen(periodo: string) {
    const actual = await this.periodoActual();
    const esActual = periodo === actual;
    return this.cache(`resumen:${periodo}`, esActual ? 60 : 86400, async () => {
      const { rows } = await this.pg.query(
        `SELECT CASE WHEN fuente = 'tarjeta' THEN 'tarjeta' ELSE 'efectivo' END AS categoria,
                moneda, COUNT(*)::int AS consumos, ROUND(SUM(monto), 2) AS total
         FROM consumos
         WHERE periodo = $1::date AND fuente IN ('tarjeta', 'efectivo', 'yape', 'plin')
         GROUP BY 1, 2
         ORDER BY 1, 2`,
        [periodo],
      );

      const ciclo = await this.cicloConDias(periodo, esActual);
      const res: Record<string, any[]> = { tarjeta: [], efectivo: [] };
      for (const r of rows) {
        const total = Number(r.total);
        const promedio = total / ciclo.dias_transcurridos;
        res[r.categoria].push({
          moneda: r.moneda,
          consumos: r.consumos,
          total,
          promedio_diario: redondear(promedio),
          proyeccion: esActual ? redondear(promedio * ciclo.dias_ciclo) : total,
          dias_periodo: ciclo.dias_ciclo,
          dias_transcurridos: ciclo.dias_transcurridos,
        });
      }
      const presupuesto = await this.presupuesto(res.tarjeta);

      // Gasto por categoría (para tarjeta)
      const { rows: catRows } = await this.pg.query(
        `SELECT COALESCE(v.categoria_auto, 'otros') AS categoria,
                COUNT(*)::int AS consumos,
                ROUND(SUM(c.monto), 2) AS total
         FROM consumos c
         LEFT JOIN app.v_consumos_categoria v ON v.id = c.id
         WHERE c.periodo = $1::date AND c.fuente = 'tarjeta'
         GROUP BY 1
         ORDER BY total DESC`,
        [periodo],
      );
      const gastos_categoria = catRows.map((r) => ({
        categoria: r.categoria as string,
        consumos: r.consumos as number,
        total: Number(r.total),
      }));

      return {
        periodo,
        actual: esActual,
        ciclo,
        tarjeta: res.tarjeta,
        efectivo: res.efectivo,
        presupuesto,
        gastos_categoria,
      };
    });
  }

  // Estado actual de la línea, cargado a mano (no se cachea para reflejar el guardado al instante).
  async banco() {
    const { rows } = await this.pg.query(
      `SELECT moneda,
              a_pagar::float8 AS a_pagar,
              linea_total::float8 AS linea_total,
              consumido::float8 AS consumido,
              disponible::float8 AS disponible,
              actualizado_en
       FROM app.banco
       ORDER BY moneda`,
    );
    return { monedas: rows };
  }

  async guardarBanco(datos: {
    moneda: string;
    a_pagar: number | null;
    linea_total: number | null;
    consumido: number | null;
    disponible: number | null;
  }) {
    const moneda = datos.moneda;
    await this.pg.query(
      `INSERT INTO app.banco (moneda, a_pagar, linea_total, consumido, disponible, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (moneda) DO UPDATE
         SET a_pagar = EXCLUDED.a_pagar,
             linea_total = EXCLUDED.linea_total,
             consumido = EXCLUDED.consumido,
             disponible = EXCLUDED.disponible,
             actualizado_en = now()`,
      [moneda, datos.a_pagar, datos.linea_total, datos.consumido, datos.disponible],
    );
    return this.banco();
  }

  categorias() {
    return [
      { value: 'alimentos', label: 'Alimentos' },
      { value: 'restaurantes', label: 'Restaurantes' },
      { value: 'servicios', label: 'Servicios' },
      { value: 'transporte', label: 'Transporte' },
      { value: 'salud', label: 'Salud' },
      { value: 'hogar', label: 'Hogar' },
      { value: 'entretenimiento', label: 'Entretenimiento' },
      { value: 'educacion', label: 'Educación' },
      { value: 'lectura', label: 'Lectura' },
      { value: 'libreria', label: 'Librería' },
      { value: 'suscripciones', label: 'Suscripciones' },
      { value: 'otros', label: 'Otros' },
    ];
  }

  async reglas() {
    const { rows } = await this.pg.query(
      `SELECT id, patron, categoria, prioridad, activa FROM app.reglas_categorias ORDER BY prioridad, id`,
    );
    return { reglas: rows };
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
                CASE WHEN c.fuente = 'tarjeta' THEN 'tarjeta' ELSE 'efectivo' END AS categoria,
                COALESCE(v.categoria_auto, 'otros') AS categoria_gasto
         FROM consumos c
         LEFT JOIN app.v_consumos_categoria v ON v.id = c.id
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
