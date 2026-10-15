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

export interface Resumen {
  periodo: string;
  actual: boolean;
  tarjeta: ResumenLinea[];
  efectivo: ResumenLinea[];
}

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
};
