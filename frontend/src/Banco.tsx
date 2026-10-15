import { useEffect, useState } from 'react';
import { api, type Banco, type BancoDatos, type BancoMoneda, type Resumen } from './api';
import { dinero, etiquetaPeriodo, moneda as monedaDatos } from './format';

const MONEDAS = ['S', 'D'] as const;
type Campo = 'a_pagar' | 'linea_total' | 'consumido' | 'disponible';
const CAMPOS: { campo: Campo; etiqueta: string }[] = [
  { campo: 'a_pagar', etiqueta: 'Próximo pago' },
  { campo: 'linea_total', etiqueta: 'Línea' },
  { campo: 'consumido', etiqueta: 'Consumido' },
  { campo: 'disponible', etiqueta: 'Disponible' },
];

type Fila = Record<Campo, string>;
const vacio = (): Fila => ({ a_pagar: '', linea_total: '', consumido: '', disponible: '' });
const aTexto = (n: number | null) => (n == null ? '' : String(n));
const aNumero = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// Monto que el banco reconoce para el periodo: en un ciclo cerrado es lo facturado; en el
// ciclo en curso, lo consumido menos lo ya facturado (consumo todavía sin facturar).
function montoBanco(m: BancoMoneda, cerrado: boolean): number | null {
  if (m.consumido == null && m.a_pagar == null) return null;
  if (cerrado) return m.a_pagar;
  if (m.consumido != null && m.a_pagar != null) return Math.round((m.consumido - m.a_pagar) * 100) / 100;
  return m.consumido ?? m.a_pagar;
}

function FichaMoneda({ m, resumen }: { m: BancoMoneda; resumen: Resumen }) {
  const { cierre, cerrado } = resumen.ciclo;
  const correo = resumen.tarjeta.find((l) => l.moneda === m.moneda)?.total ?? 0;
  const banco = montoBanco(m, cerrado);
  const diff = banco == null ? null : Math.round((correo - banco) * 100) / 100;
  const pctLinea = m.linea_total ? Math.min(100, ((m.consumido ?? 0) / m.linea_total) * 100) : null;
  const d = monedaDatos(m.moneda);
  return (
    <article className="moneda banco-ficha">
      <header>
        <span className="codigo">{d.simbolo}</span>
        <span className="suave">{d.nombre}</span>
      </header>
      {m.linea_total != null && (
        <div className="barra-avance banco-linea">
          <div className="barra-relleno" style={{ width: `${pctLinea ?? 0}%` }} />
        </div>
      )}
      <dl className="detalle">
        {m.linea_total != null && (
          <div>
            <dt>Línea</dt>
            <dd>{dinero(m.linea_total, m.moneda)}</dd>
          </div>
        )}
        {m.consumido != null && (
          <div>
            <dt>Consumido</dt>
            <dd>
              {dinero(m.consumido, m.moneda)}
              {pctLinea != null && <span className="suave"> ({Math.round(pctLinea)}%)</span>}
            </dd>
          </div>
        )}
        {m.disponible != null && (
          <div>
            <dt>Disponible</dt>
            <dd>{dinero(m.disponible, m.moneda)}</dd>
          </div>
        )}
        {m.a_pagar != null && (
          <div>
            <dt>Próximo pago</dt>
            <dd>{dinero(m.a_pagar, m.moneda)}</dd>
          </div>
        )}
        {banco != null && (
          <div>
            <dt>{cerrado ? 'Facturado (banco)' : 'Consumo del ciclo (banco)'}</dt>
            <dd>{dinero(banco, m.moneda)}</dd>
          </div>
        )}
      </dl>
      {banco != null && (
        <footer className="conciliar">
          <div>
            <span className="suave">Correo</span>
            <strong>{dinero(correo, m.moneda)}</strong>
          </div>
          <div>
            <span className="suave">Diferencia</span>
            {diff != null && Math.abs(diff) < 0.01 ? (
              <span className="pildora verde">Al día</span>
            ) : (
              <span className="pildora rojo">Por conciliar {dinero(diff ?? 0, m.moneda)}</span>
            )}
          </div>
          <p className="suave nota">
            {cerrado ? 'Ciclo cerrado el' : 'Cierre previsto el'} {etiquetaPeriodo(cierre)}
          </p>
        </footer>
      )}
    </article>
  );
}

// Bloque del banco: fichas por moneda (solo lectura) + formulario corto para cargar los datos.
export default function BancoCard({
  resumen,
  banco,
  onGuardado,
}: {
  resumen: Resumen;
  banco: Banco | null;
  onGuardado: (b: Banco) => void;
}) {
  const [form, setForm] = useState<Record<string, Fila>>({ S: vacio(), D: vacio() });
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    const base: Record<string, Fila> = { S: vacio(), D: vacio() };
    for (const m of banco?.monedas ?? []) {
      base[m.moneda] = {
        a_pagar: aTexto(m.a_pagar),
        linea_total: aTexto(m.linea_total),
        consumido: aTexto(m.consumido),
        disponible: aTexto(m.disponible),
      };
    }
    setForm(base);
  }, [banco]);

  const editar = (mon: string, campo: Campo, valor: string) => {
    setForm((f) => ({ ...f, [mon]: { ...f[mon], [campo]: valor } }));
    setEstado(null);
  };

  async function guardar() {
    setGuardando(true);
    setEstado(null);
    try {
      let res: Banco | null = null;
      for (const mon of MONEDAS) {
        const datos: BancoDatos = {
          moneda: mon,
          a_pagar: aNumero(form[mon].a_pagar),
          linea_total: aNumero(form[mon].linea_total),
          consumido: aNumero(form[mon].consumido),
          disponible: aNumero(form[mon].disponible),
        };
        res = await api.guardarBanco(datos);
      }
      if (res) onGuardado(res);
      setEstado({ tipo: 'ok', texto: 'Datos guardados' });
    } catch (e) {
      setEstado({ tipo: 'error', texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  const fichas = banco?.monedas ?? [];

  return (
    <section className="tarjeta banco">
      <div className="fila-cabecera">
        <h2>Banco (BCP Visa)</h2>
        <span className="suave">Datos cargados a mano</span>
      </div>

      {fichas.length > 0 ? (
        <div className="monedas">
          {fichas.map((m) => (
            <FichaMoneda key={m.moneda} m={m} resumen={resumen} />
          ))}
        </div>
      ) : (
        <p className="suave">Aún no has cargado los datos del banco.</p>
      )}

      <form
        className="banco-form"
        onSubmit={(e) => {
          e.preventDefault();
          void guardar();
        }}
      >
        <table className="tabla">
          <thead>
            <tr>
              <th>Concepto</th>
              {MONEDAS.map((mon) => (
                <th key={mon} className="num">
                  {monedaDatos(mon).nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAMPOS.map(({ campo, etiqueta }) => (
              <tr key={campo}>
                <td>{etiqueta}</td>
                {MONEDAS.map((mon) => (
                  <td key={mon} className="num">
                    <input
                      className="monto-input"
                      type="text"
                      inputMode="decimal"
                      value={form[mon][campo]}
                      onChange={(e) => editar(mon, campo, e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="banco-acciones">
          {estado && (
            <span className={estado.tipo === 'ok' ? 'suave' : 'error'} role={estado.tipo === 'error' ? 'alert' : undefined}>
              {estado.texto}
            </span>
          )}
          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  );
}
