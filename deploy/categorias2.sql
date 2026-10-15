-- Mejorar cobertura
INSERT INTO app.reglas_categorias (patron, categoria, prioridad) VALUES
  ('%PLIN-%', 'servicios', 30),
  ('%PAGALO PE%', 'servicios', 30),
  ('%BIM-%', 'servicios', 30),
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
  ('%LISTO %', 'alimentos', 20),
  ('%IKF%', 'alimentos', 20),
  ('%MFA%', 'alimentos', 20)
ON CONFLICT DO NOTHING;
