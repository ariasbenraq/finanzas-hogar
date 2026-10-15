INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%PVEA VSALVADOR%', 'alimentos', 10),
  ('%BK %', 'restaurantes', 20),
  ('%BENAVIDES%', 'alimentos', 20),
  ('%BOTICA%', 'salud', 10),
  ('%CARRANZA%', 'hogar', 20),
  ('%MALL%', 'otros', 40),
  ('%ALAMEDAS%', 'alimentos', 20),
  ('%DULCEMANIA%', 'restaurantes', 20),
  ('%BCP%HELADERIA%', 'restaurantes', 20),
  ('%E S%', 'alimentos', 20),
  ('%TORTAS EMELY%', 'restaurantes', 10),
  ('%CE RENIEC%', 'servicios', 30),
  ('%CENTRO COMERCIAL%', 'otros', 40)
ON CONFLICT DO NOTHING;
