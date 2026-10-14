import type { Periodo } from './api';
import { etiquetaPeriodo } from './format';

interface Props {
  periodos: Periodo[];
  valor: string;
  onChange: (periodo: string) => void;
}

// Selector del periodo activo. En las sesiones 9 y 10 lo usan los gráficos y la tabla.
export default function SelectorPeriodo({ periodos, valor, onChange }: Props) {
  return (
    <label className="selector">
      <span className="suave">Periodo</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)}>
        {periodos.map((p) => (
          <option key={p.periodo} value={p.periodo}>
            {etiquetaPeriodo(p.periodo)}
            {p.actual ? ' · actual' : ''}
            {p.parcial ? ' · parcial' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
