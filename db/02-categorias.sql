CREATE SCHEMA IF NOT EXISTS app;

-- Reglas para categorizar consumos por establecimiento (case-insensitive, coincidencia simple por LIKE)
CREATE TABLE IF NOT EXISTS app.reglas_categorias (
  id SERIAL PRIMARY KEY,
  patron TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('alimentos','restaurantes','servicios','transporte','salud','hogar','entretenimiento','educacion','suscripciones','otros')),
  prioridad INT NOT NULL DEFAULT 100,
  activa BOOLEAN NOT NULL DEFAULT true
);

-- Alimentos
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%PLAZA VEA%', 'alimentos', 10),
  ('%SUPERM METRO%', 'alimentos', 10),
  ('%MASS%', 'alimentos', 10),
  ('%TAI LOY%', 'alimentos', 10),
  ('%WONG%', 'alimentos', 10),
  ('%METRO %', 'alimentos', 10),
  ('%BODEGA DIAZ%', 'alimentos', 10),
  ('%TIENDA DEL CAMPO%', 'alimentos', 10),
  ('%MINIMARKET%', 'alimentos', 20),
  ('%VENDOMATICA%', 'alimentos', 20),
  ('%TAMBO %', 'alimentos', 25),
  ('%DJULIA%', 'alimentos', 15),
  ('%LA RAMBLA%', 'alimentos', 10),
  ('%AVICOLA%', 'alimentos', 10),
  ('%PANADERIA%', 'alimentos', 15),
  ('%LLAMPAYEC%', 'alimentos', 15),
  ('%COOLBOX%', 'alimentos', 20),
  ('%NORMITA%', 'alimentos', 20)
ON CONFLICT DO NOTHING;

-- Restaurantes/cafeterías
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%LA PEPA%', 'restaurantes', 10),
  ('%LA CASA DE LA TIA%', 'restaurantes', 10),
  ('%CHIFA%', 'restaurantes', 10),
  ('%CEVICHERIA%', 'restaurantes', 10),
  ('%IZI%', 'restaurantes', 15),
  ('%OPENPAY%', 'restaurantes', 15),
  ('%SHIMAYA%', 'restaurantes', 10),
  ('%NIKO NIKO%', 'restaurantes', 10),
  ('%TENTA FRUTA%', 'restaurantes', 10),
  ('%ROSA PASTEL%', 'restaurantes', 10),
  ('%GUSTILANDIA%', 'restaurantes', 10),
  ('%TABERNA%', 'restaurantes', 10),
  ('%KIRIKO%', 'restaurantes', 10),
  ('%CAFE %', 'restaurantes', 20),
  ('%KAFFE%', 'restaurantes', 20),
  ('%PASONKI%', 'restaurantes', 20),
  ('%BESO FRANCES%', 'restaurantes', 15),
  ('%LATTE BAKERY%', 'restaurantes', 15),
  ('%DOLLY DOY%', 'restaurantes', 15),
  ('%FYT COLMENARES%', 'restaurantes', 15),
  ('%ATIPICAFE%', 'restaurantes', 15),
  ('%JUAN VALDEZ%', 'restaurantes', 15),
  ('%PUKU PUKU%', 'restaurantes', 15),
  ('%GROUND COFFEE%', 'restaurantes', 15)
ON CONFLICT DO NOTHING;

-- Servicios
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%SEDAPAL%', 'servicios', 5),
  ('%ENTEL%', 'servicios', 5),
  ('%CLARO%', 'servicios', 5),
  ('%MOVISTAR%', 'servicios', 5),
  ('%PLUZ ENERGIA%', 'servicios', 5),
  ('%MUNI%', 'servicios', 10),
  ('%PAGOSERVIC%', 'servicios', 10),
  ('%RECIBOS%', 'servicios', 10)
ON CONFLICT DO NOTHING;

-- Salud
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%BOTICAS%', 'salud', 5),
  ('%FARMACIAS%', 'salud', 5),
  ('%PHARMIVET%', 'salud', 5)
ON CONFLICT DO NOTHING;

-- Hogar
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%LAKSHMI%', 'hogar', 10),
  ('%PROMART%', 'hogar', 10),
  ('%EDISEL%', 'hogar', 10),
  ('%SODIMAC%', 'hogar', 10),
  ('%HYM%', 'hogar', 20),
  ('%LA BICICLETERIA%', 'hogar', 20),
  ('%PARTTEEL%', 'hogar', 20),
  ('%LINCE 01 ROKYS%', 'hogar', 20),
  ('%FLORA Y FAUNA%', 'hogar', 15),
  ('%BUBBA BAGS%', 'hogar', 20),
  ('%MINISO%', 'hogar', 20),
  ('%DETALLES%', 'hogar', 20)
ON CONFLICT DO NOTHING;

-- Entretenimiento
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%NINTENDO%', 'entretenimiento', 5),
  ('%CIRKULA%', 'entretenimiento', 5),
  ('%PARQUE LAS LEYENDAS%', 'entretenimiento', 10),
  ('%SILLARES%', 'entretenimiento', 15),
  ('%ANOMALY%', 'entretenimiento', 15),
  ('%UDEMY%', 'entretenimiento', 15)
ON CONFLICT DO NOTHING;

-- Transporte
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%OPENPAY*KOKO BARRANCO%', 'transporte', 20)
ON CONFLICT DO NOTHING;

GRANT USAGE ON SCHEMA app TO dashboard_app;
GRANT SELECT ON app.reglas_categorias TO dashboard_app;
GRANT INSERT, UPDATE, DELETE ON app.reglas_categorias TO dashboard_app;
GRANT USAGE, SELECT ON SEQUENCE app.reglas_categorias_id_seq TO dashboard_app;

-- Vista para obtener categoría por movimiento
CREATE OR REPLACE VIEW app.v_consumos_categoria AS
SELECT c.id,
       c.establecimiento,
       (SELECT r.categoria
        FROM app.reglas_categorias r
        WHERE upper(c.establecimiento) LIKE r.patron AND r.activa
        ORDER BY r.prioridad, r.id
        LIMIT 1) AS categoria_auto
FROM consumos c;

GRANT SELECT ON app.v_consumos_categoria TO dashboard_app;

-- Mejorar cobertura
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%PLIN-%', 'servicios', 30),
  ('%PAGALO PE%', 'servicios', 30),
  ('%PVEA BRASIL%', 'alimentos', 5),
  ('%PVEA SALAVERRY%', 'alimentos', 5),
  ('%PVEA BRENA%', 'alimentos', 5),
  ('%PVEA MIRAFLORES%', 'alimentos', 5),
  ('%MFI24%', 'alimentos', 15),
  ('%SOCIEDAD BIBLICA%', 'otros', 30),
  ('%GRUPO CARRANZA%', 'hogar', 20),
  ('%SANLUIS%', 'alimentos', 20),
  ('%HUAMACHUCO%', 'alimentos', 20),
  ('%T7101%', 'alimentos', 20),
  ('%VEND OPTION%', 'alimentos', 20),
  ('%BIM-%', 'servicios', 30),
  ('%LISTO %', 'alimentos', 20),
  ('%IKF%', 'alimentos', 20),
  ('%MFA%', 'alimentos', 20)
ON CONFLICT DO NOTHING;
