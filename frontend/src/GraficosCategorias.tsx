import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Formatter } from 'recharts/types/component/DefaultTooltipContent';
import type { GastoPorCategoria } from './api';
import { colorSerie, dinero } from './format';

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

export default function GraficosCategorias({ datos }: { datos: GastoPorCategoria[] }) {
  if (datos.length === 0) return null;
  const data = datos.map((d) => ({ categoria: d.categoria, total: d.total, consumos: d.consumos }));
  const formatear: Formatter = (valor) => [dinero(Number(valor), 'S'), 'Total'];

  return (
    <section className="tarjeta">
      <h2>Gasto por categoría (tarjeta)</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 80, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => numero.format(Number(v))} {...eje} />
          <YAxis type="category" dataKey="categoria" {...eje} />
          <Tooltip contentStyle={tooltipEstilo} formatter={formatear} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="total" fill={colorSerie(0)} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
