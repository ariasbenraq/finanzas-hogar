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
};
