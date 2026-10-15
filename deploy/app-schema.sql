-- Esquema propio de la app sobre la base de datos `consumos` existente.
-- Se aplica con el usuario `n8n` (dueño de la BD). El rol `dashboard_app`
-- se crea aparte, con su contraseña, para no versionar secretos.
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.usuarios (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  creado_en     TIMESTAMPTZ DEFAULT now()
);

GRANT CONNECT ON DATABASE consumos TO dashboard_app;
GRANT USAGE ON SCHEMA public, app TO dashboard_app;
GRANT SELECT ON public.consumos TO dashboard_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.usuarios TO dashboard_app;
GRANT USAGE, SELECT ON SEQUENCE app.usuarios_id_seq TO dashboard_app;
