INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%MC DONALDS%', 'restaurantes', 10),
  ('%MERCADO PAGO%', 'servicios', 40),
  ('%MISION CRISTIANA%', 'otros', 40),
  ('%MOVIL BUS%', 'transporte', 30),
  ('%LUCKY SUPERMARKET%', 'alimentos', 15),
  ('%LASFLORES%', 'alimentos', 20)
ON CONFLICT DO NOTHING;
