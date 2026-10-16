-- Categorías adicionales: `lectura` (libros) y `libreria` (útiles/manualidades),
-- más reglas nuevas de `educacion` (universidades, institutos, cursos en línea).

-- 1. Ampliar el CHECK de categorías permitidas.
ALTER TABLE app.reglas_categorias DROP CONSTRAINT IF EXISTS reglas_categorias_categoria_check;
ALTER TABLE app.reglas_categorias ADD CONSTRAINT reglas_categorias_categoria_check CHECK (
  categoria IN ('alimentos','restaurantes','servicios','transporte','salud','hogar',
                'entretenimiento','educacion','lectura','libreria','suscripciones','otros')
);

-- 2. Unicidad (patron, categoria) para que el seed sea idempotente y no acumule duplicados.
DELETE FROM app.reglas_categorias a
  USING app.reglas_categorias b
  WHERE a.id > b.id AND a.patron = b.patron AND a.categoria = b.categoria;

CREATE UNIQUE INDEX IF NOT EXISTS reglas_categorias_patron_categoria_key
  ON app.reglas_categorias (patron, categoria);

-- 3. Reglas nuevas.
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%UNIVERSIDAD%', 'educacion', 15),
  ('%INSTITUTO%', 'educacion', 15),
  ('%CURSO%', 'educacion', 20),
  ('%PLATAFORMA%', 'educacion', 25),
  ('%COLEGIO%', 'educacion', 20),
  ('%LISTO UNIVERSIDAD%', 'educacion', 10),
  ('%UDEMY%', 'educacion', 10),
  ('%LIBRO%', 'lectura', 15),
  ('%LIBRER%', 'libreria', 15),
  ('%IZI*LIBRER%', 'libreria', 15),
  ('%LIBRERIAS GARZON%', 'libreria', 10),
  ('%GARZON%', 'libreria', 20),
  ('%PAPELER%', 'libreria', 15),
  ('%MANUALIDA%', 'libreria', 20)
ON CONFLICT (patron, categoria) DO NOTHING;
