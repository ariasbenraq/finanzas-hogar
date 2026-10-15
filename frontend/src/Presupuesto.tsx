import type { Presupuesto as PresupuestoDatos } from './api';
import { dinero } from './format';

// Barra de presupuesto de la tarjeta (soles). Marca el avance real y la proyección del ciclo.
export default function Presupuesto({ datos }: { datos: PresupuestoDatos }) {
  if (datos.monto == null || datos.monto <= 0) return null;
  const pct = Math.min(100, datos.porcentaje ?? 0);
  const pctProy = Math.min(100, (datos.proyeccion / datos.monto) * 100);
  return (
    <section className={`tarjeta presupuesto ${datos.excedido ? 'excedido' : ''}`}>
      <div className="fila-cabecera">
        <h2>Presupuesto tarjeta (S/)</h2>
        <span className={datos.excedido ? 'pildora rojo' : 'pildora verde'}>
          {datos.excedido ? 'Proyección excedida' : 'Dentro del presupuesto'}
        </span>
      </div>
      <p className="presupuesto-cifras">
        <strong>{dinero(datos.gastado, datos.moneda)}</strong>
        <span className="suave"> de {dinero(datos.monto, datos.moneda)}</span>
      </p>
      <div className="barra-avance">
        <div className="barra-relleno" style={{ width: `${pct}%` }} />
        <div className="barra-marca" style={{ left: `${pctProy}%` }} title="Proyección del ciclo" />
      </div>
      <div className="presupuesto-pie">
        <span className="suave">{Math.round(datos.porcentaje ?? 0)}% consumido</span>
        <span className={datos.excedido ? 'error' : 'suave'}>
          Proyección {dinero(datos.proyeccion, datos.moneda)} ({Math.round((datos.proyeccion / datos.monto) * 100)}%)
        </span>
      </div>
    </section>
  );
}
