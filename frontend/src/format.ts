// Monedas tal y como las guarda la base (S = soles, D = dólares).
const MONEDAS: Record<string, { codigo: string; simbolo: string; nombre: string }> = {
  S: { codigo: 'PEN', simbolo: 'S/', nombre: 'Soles' },
  D: { codigo: 'USD', simbolo: 'US$', nombre: 'Dólares' },
};

export function moneda(clave: string) {
  return MONEDAS[clave] ?? { codigo: clave, simbolo: clave, nombre: clave };
}

export function dinero(monto: number, clave: string): string {
  const { codigo, simbolo } = moneda(clave);
  try {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: codigo }).format(monto);
  } catch {
    return `${simbolo} ${monto.toFixed(2)}`;
  }
}

// "2026-09-25" -> "25 sep 2026"
export function etiquetaPeriodo(periodo: string): string {
  const [y, m, d] = periodo.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fecha);
}

// "2026-09-25" -> "25 sep" (para el eje de los gráficos)
export function etiquetaDia(dia: string): string {
  const [y, m, d] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(fecha);
}

export const CATEGORIAS: Record<string, string> = {
  tarjeta: 'Tarjeta',
  efectivo: 'Efectivo',
};

function titulo(clave: string): string {
  return CATEGORIAS[clave] ?? clave.charAt(0).toUpperCase() + clave.slice(1);
}

// Etiqueta de una serie del diario, p. ej. "Tarjeta · S/".
export function etiquetaSerie(categoria: string, monedaClave: string): string {
  return `${titulo(categoria)} · ${moneda(monedaClave).simbolo}`;
}

// Paleta de series (tomada de la plantilla de referencia).
export const COLORES = ['#4f46e5', '#22c55e', '#facc15', '#ef4444', '#14b8a6', '#e879f9'];

export function colorSerie(indice: number): string {
  return COLORES[indice % COLORES.length];
}
