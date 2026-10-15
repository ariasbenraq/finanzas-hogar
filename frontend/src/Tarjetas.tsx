import type { Resumen, ResumenLinea } from './api';
import { dinero, moneda } from './format';

function TarjetaMoneda({ linea, actual }: { linea: ResumenLinea; actual: boolean }) {
  const m = moneda(linea.moneda);
  return (
    <article className="moneda">
      <header>
        <span className="codigo">{m.simbolo}</span>
        <span className="suave">{m.nombre}</span>
      </header>
      <p className="total">{dinero(linea.total, linea.moneda)}</p>
      <dl className="detalle">
        <div>
          <dt>Consumos</dt>
          <dd>{linea.consumos}</dd>
        </div>
        <div>
          <dt>Promedio diario</dt>
          <dd>{dinero(linea.promedio_diario, linea.moneda)}</dd>
        </div>
        {actual && (
          <div>
            <dt>Proyección</dt>
            <dd>{dinero(linea.proyeccion, linea.moneda)}</dd>
          </div>
        )}
        <div>
          <dt>Días</dt>
          <dd>
            {linea.dias_transcurridos}/{linea.dias_periodo}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function Bloque({
  titulo,
  lineas,
  actual,
  verde = false,
}: {
  titulo: string;
  lineas: ResumenLinea[];
  actual: boolean;
  verde?: boolean;
}) {
  return (
    <section className={verde ? 'tarjeta verde' : 'tarjeta'}>
      <h2>{titulo}</h2>
      {lineas.length === 0 ? (
        <p className="suave">Sin consumos en este periodo.</p>
      ) : (
        <div className="monedas">
          {lineas.map((l) => (
            <TarjetaMoneda key={l.moneda} linea={l} actual={actual} />
          ))}
        </div>
      )}
    </section>
  );
}

// Tarjetas del periodo: una por categoría (tarjeta/efectivo) y moneda.
// La proyección solo se muestra en el periodo actual (en los cerrados coincide con el total).
export default function Tarjetas({ resumen }: { resumen: Resumen }) {
  return (
    <div className="bloques">
      <Bloque titulo="Tarjeta" lineas={resumen.tarjeta} actual={resumen.actual} />
      <Bloque titulo="Efectivo" lineas={resumen.efectivo} actual={resumen.actual} verde />
    </div>
  );
}
