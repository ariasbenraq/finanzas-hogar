import type { Resumen } from './api';
import { etiquetaPeriodo } from './format';

// Cabecera del ciclo real de facturación: días del ciclo y cuántos faltan para pagar.
export default function Ciclo({ resumen }: { resumen: Resumen }) {
  const c = resumen.ciclo;
  return (
    <section className="tarjeta ciclo">
      <div className="fila-cabecera">
        <div>
          <h2>Ciclo {etiquetaPeriodo(resumen.periodo)}</h2>
          <p className="suave">
            Consumos del {etiquetaPeriodo(c.inicio)} al {etiquetaPeriodo(c.cierre)} · {c.dias_ciclo} días
          </p>
        </div>
        <span className={c.cerrado ? 'pildora' : 'pildora verde'}>
          {c.cerrado ? 'Cerrado' : 'En curso'}
        </span>
      </div>
      <dl className="detalle ciclo-datos">
        <div>
          <dt>Días transcurridos</dt>
          <dd>
            {c.dias_transcurridos}/{c.dias_ciclo}
          </dd>
        </div>
        <div>
          <dt>Cierre</dt>
          <dd>{etiquetaPeriodo(c.cierre)}</dd>
        </div>
        {c.pago && (
          <div>
            <dt>Pago</dt>
            <dd>
              {etiquetaPeriodo(c.pago)}
              {!c.cerrado && c.dias_para_pago != null && ` · faltan ${c.dias_para_pago} días`}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
