INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%PVEA LA MOLINA%', 'alimentos', 10),
  ('%AEMUS%', 'hogar', 30),
  ('%ANGAMOS%', 'alimentos', 20),
  ('%ARUMA%', 'restaurantes', 20),
  ('%EL ARANDANO%', 'restaurantes', 20),
  ('%FABER CASTELL%', 'educacion', 30),
  ('%FAMIGLIA%', 'restaurantes', 20),
  ('%GRUPO HC%', 'hogar', 30),
  ('%GRUPO SYS%', 'otros', 40),
  ('%EST. SERVICIOS%', 'transporte', 30),
  ('%ESTACION EL SAUCE%', 'alimentos', 15),
  ('%REAL PLAZA%', 'otros', 40),
  ('%CERCADO%', 'alimentos', 30),
  ('%Culqui%', 'alimentos', 20)
ON CONFLICT DO NOTHING;
