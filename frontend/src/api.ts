export interface Periodo {
  periodo: string;
  consumos: number;
  actual: boolean;
  parcial: boolean;
}

// Una línea del resumen: totales de una categoría para una moneda concreta.
export interface ResumenLinea {
  moneda: string;
  consumos: number;
  total: number;
  promedio_diario: number;
  proyeccion: number;
  dias_periodo: number;
  dias_transcurridos: number;
}

// Ciclo real de facturación (BCP) del periodo.
export interface Ciclo {
  inicio: string;
  cierre: string;
  pago: string | null;
  dias_ciclo: number;
  dias_transcurridos: number;
  dias_para_pago: number | null;
  cerrado: boolean;
}

// Presupuesto mensual de la tarjeta (en soles) frente a lo gastado y lo proyectado.
export interface Presupuesto {
  moneda: string;
  monto: number | null;
  gastado: number;
  porcentaje: number | null;
  proyeccion: number;
  excedido: boolean;
}

export interface GastoPorCategoria {
  categoria: string;
  consumos: number;
  total: number;
}

export interface Resumen {
  periodo: string;
  actual: boolean;
  ciclo: Ciclo;
  tarjeta: ResumenLinea[];
  efectivo: ResumenLinea[];
  presupuesto: Presupuesto;
  gastos_categoria?: GastoPorCategoria[];
}

// Estado de la línea, cargado a mano.
export interface BancoMoneda {
  moneda: string;
  a_pagar: number | null;
  linea_total: number | null;
  consumido: number | null;
  disponible: number | null;
  actualizado_en: string;
}

export interface Banco {
  monedas: BancoMoneda[];
}

export type BancoDatos = Omit<BancoMoneda, 'actualizado_en'>;

// Serie diaria de una categoría y moneda (un punto por día del periodo).
export interface PuntoDiario {
  dia: string;
  total: number;
  consumos: number;
  acumulado: number;
}

export interface SerieDiaria {
  categoria: string;
  moneda: string;
  puntos: PuntoDiario[];
}

export interface Diario {
  periodo: string;
  actual: boolean;
  series: SerieDiaria[];
}

export interface Movimiento {
  id: number;
  fecha_local: string;
  establecimiento: string | null;
  monto: number;
  moneda: string;
  categoria: string;
  categoria_gasto?: string;
}

export interface MovimientosPagina {
  periodo: string;
  total: number;
  limit: number;
  offset: number;
  items: Movimiento[];
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Se llama cuando el servidor responde 401 en una ruta protegida (sesión vencida o cerrada).
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (!res.ok) {
    let mensaje = res.statusText || `Error ${res.status}`;
    try {
      const body = await res.json();
      const m = body?.message;
      if (Array.isArray(m)) mensaje = m.join(', ');
      else if (typeof m === 'string') mensaje = m;
    } catch {
      /* la respuesta no traía JSON */
    }
    const esAuth = path === '/auth/login' || path === '/auth/me';
    if (res.status === 401 && !esAuth) onUnauthorized?.();
    throw new ApiError(res.status, mensaje);
  }
  return (await res.json()) as T;
}

export const api = {
  me: () => request<{ email: string }>('/auth/me'),
  login: (email: string, password: string) =>
    request<{ email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST', body: '{}' }),
  periodos: () => request<Periodo[]>('/periodos'),
  resumen: (periodo: string) => request<Resumen>(`/resumen?periodo=${encodeURIComponent(periodo)}`),
  diario: (periodo: string) => request<Diario>(`/diario?periodo=${encodeURIComponent(periodo)}`),
  movimientos: (opts: { periodo: string; categoria?: string | null; limit?: number; offset?: number }) => {
    const q = new URLSearchParams({ periodo: opts.periodo });
    if (opts.categoria) q.set('categoria', opts.categoria);
    if (opts.limit != null) q.set('limit', String(opts.limit));
    if (opts.offset != null) q.set('offset', String(opts.offset));
    return request<MovimientosPagina>(`/movimientos?${q}`);
  },
  banco: () => request<Banco>('/banco'),
  guardarBanco: (datos: BancoDatos) =>
    request<Banco>('/banco', { method: 'PUT', body: JSON.stringify(datos) }),
  categorias: () => request<{ value: string; label: string }[]>('/categorias'),
  reglas: () => request<{ reglas: Array<{ id: number; patron: string; categoria: string; prioridad: number; activa: boolean }> }>('/reglas'),
};
