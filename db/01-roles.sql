CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.usuarios (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  creado_en     TIMESTAMPTZ DEFAULT now()
);

CREATE ROLE dashboard_app LOGIN PASSWORD 'cambia-esto';

GRANT CONNECT ON DATABASE consumos TO dashboard_app;
GRANT USAGE ON SCHEMA public, app TO dashboard_app;
GRANT SELECT ON public.consumos TO dashboard_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.usuarios TO dashboard_app;
GRANT USAGE, SELECT ON SEQUENCE app.usuarios_id_seq TO dashboard_app;
