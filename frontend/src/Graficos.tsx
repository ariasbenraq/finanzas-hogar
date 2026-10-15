import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Formatter } from 'recharts/types/component/DefaultTooltipContent';
import type { SerieDiaria } from './api';
import { colorSerie, dinero, etiquetaDia, etiquetaSerie } from './format';

interface FilaDiaria {
  dia: string;
  [etiqueta: string]: string | number;
}

interface Clave {
  key: string;
  color: string;
  moneda: string;
}

// Las series comparten los mismos días; se pivotea a una fila por día con una columna por serie.
function pivotar(series: SerieDiaria[], campo: 'total' | 'acumulado'): { data: FilaDiaria[]; claves: Clave[] } {
  const claves: Clave[] = series.map((s, i) => ({
    key: etiquetaSerie(s.categoria, s.moneda),
    color: colorSerie(i),
    moneda: s.moneda,
  }));

  const mapa = new Map<string, FilaDiaria>();
  series.forEach((s) => {
    const etiqueta = etiquetaSerie(s.categoria, s.moneda);
    s.puntos.forEach((p) => {
      if (!mapa.has(p.dia)) mapa.set(p.dia, { dia: p.dia });
      mapa.get(p.dia)![etiqueta] = p[campo];
    });
  });

  const data = [...mapa.values()].sort((a, b) => String(a.dia).localeCompare(String(b.dia)));
  return { data, claves };
}

const eje = {
  tick: { fill: 'var(--suave)', fontSize: 12 },
  axisLine: { stroke: 'var(--borde)' },
  tickLine: false,
} as const;

const tooltipEstilo = {
  background: 'var(--superficie)',
  border: '1px solid var(--borde)',
  borderRadius: 10,
  color: 'var(--texto)',
  boxShadow: '0 8px 24px rgba(16,24,40,.12)',
  fontSize: 13,
} as const;

const numero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });

function tarjetaGrafico(titulo: string, children: ReactNode) {
  return (
    <div className="grafico">
      <h3>{titulo}</h3>
      {children}
    </div>
  );
}

export default function Graficos({ series }: { series: SerieDiaria[] }) {
  if (series.length === 0) {
    return <p className="suave">Sin consumos en este periodo.</p>;
  }

  const acumulado = pivotar(series, 'acumulado');
  const diario = pivotar(series, 'total');

  const formatear = (claves: Clave[]): Formatter => (valor, nombre) => {
    const c = claves.find((k) => k.key === String(nombre));
    return [dinero(Number(valor), c?.moneda ?? 'S'), String(nombre)];
  };

  return (
    <section className="graficos">
      {tarjetaGrafico(
        'Gasto acumulado',
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={acumulado.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
            <XAxis dataKey="dia" tickFormatter={etiquetaDia} {...eje} minTickGap={16} />
            <YAxis tickFormatter={(v) => numero.format(Number(v))} width={56} {...eje} />
            <Tooltip
              contentStyle={tooltipEstilo}
              labelFormatter={(l) => etiquetaDia(String(l))}
              formatter={formatear(acumulado.claves)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {acumulado.claves.map((c) => (
              <Area
                key={c.key}
                type="monotone"
                dataKey={c.key}
                stroke={c.color}
                fill={c.color}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>,
      )}
      {tarjetaGrafico(
        'Gasto diario',
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={diario.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
            <XAxis dataKey="dia" tickFormatter={etiquetaDia} {...eje} minTickGap={16} />
            <YAxis tickFormatter={(v) => numero.format(Number(v))} width={56} {...eje} />
            <Tooltip
              contentStyle={tooltipEstilo}
              labelFormatter={(l) => etiquetaDia(String(l))}
              formatter={formatear(diario.claves)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {diario.claves.map((c) => (
              <Bar key={c.key} dataKey={c.key} fill={c.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>,
      )}
    </section>
  );
}
