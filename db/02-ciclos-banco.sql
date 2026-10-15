-- Cronograma real de facturación (BCP Visa), estado de la línea y configuración.
-- Se aplica con el usuario dueño de la base (dev o n8n en prod).
-- No versiona secretos: el rol dashboard_app se crea en 01-roles.sql / deploy/app-schema.sql.

CREATE SCHEMA IF NOT EXISTS app;

-- Ciclo de facturación. `periodo` usa la misma etiqueta que public.consumos.periodo
-- (AAAA-MM-25), que es el mes en que abren los consumos del ciclo.
CREATE TABLE IF NOT EXISTS app.ciclos (
  periodo DATE PRIMARY KEY,
  inicio  DATE NOT NULL,   -- primer día de consumos del ciclo
  cierre  DATE NOT NULL,   -- día de cierre de facturación (inclusive)
  pago    DATE NOT NULL    -- fecha límite de pago
);

-- Estado actual de la línea de crédito, cargado a mano. Una fila por moneda.
CREATE TABLE IF NOT EXISTS app.banco (
  moneda         CHAR(1) PRIMARY KEY,   -- 'S' soles, 'D' dólares
  a_pagar        NUMERIC(12,2),         -- próximo pago / monto facturado vigente
  linea_total    NUMERIC(12,2),         -- línea de crédito
  consumido      NUMERIC(12,2),         -- consumo acumulado de la línea
  disponible     NUMERIC(12,2),         -- disponible
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parámetros de la app (p. ej. presupuesto mensual de la tarjeta en soles).
CREATE TABLE IF NOT EXISTS app.config (
  clave TEXT PRIMARY KEY,
  valor NUMERIC NOT NULL
);

INSERT INTO app.config (clave, valor) VALUES ('presupuesto_tarjeta_soles', 2300)
ON CONFLICT (clave) DO NOTHING;

-- Cronograma BCP 2026 (cierres/pagos reales); se extiende con los bordes 2025-2027.
INSERT INTO app.ciclos (periodo, inicio, cierre, pago) VALUES
  ('2025-11-25', '2025-11-26', '2025-12-24', '2026-01-20'),
  ('2025-12-25', '2025-12-25', '2026-01-23', '2026-02-23'),
  ('2026-01-25', '2026-01-24', '2026-02-25', '2026-03-23'),
  ('2026-02-25', '2026-02-26', '2026-03-25', '2026-04-21'),
  ('2026-03-25', '2026-03-26', '2026-04-24', '2026-05-20'),
  ('2026-04-25', '2026-04-25', '2026-05-25', '2026-06-22'),
  ('2026-05-25', '2026-05-26', '2026-06-25', '2026-07-21'),
  ('2026-06-25', '2026-06-26', '2026-07-24', '2026-08-20'),
  ('2026-07-25', '2026-07-25', '2026-08-25', '2026-09-22'),
  ('2026-08-25', '2026-08-26', '2026-09-25', '2026-10-20'),
  ('2026-09-25', '2026-09-26', '2026-10-23', '2026-11-23'),
  ('2026-10-25', '2026-10-24', '2026-11-25', '2026-12-22'),
  ('2026-11-25', '2026-11-26', '2026-12-24', '2027-01-20')
ON CONFLICT (periodo) DO UPDATE
  SET inicio = EXCLUDED.inicio, cierre = EXCLUDED.cierre, pago = EXCLUDED.pago;

GRANT USAGE ON SCHEMA app TO dashboard_app;
GRANT SELECT ON app.ciclos, app.banco, app.config TO dashboard_app;
GRANT INSERT, UPDATE, DELETE ON app.banco TO dashboard_app;
