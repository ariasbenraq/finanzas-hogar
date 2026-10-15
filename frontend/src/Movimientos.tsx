import { useEffect, useState } from 'react';
import { api, type MovimientosPagina } from './api';
import { CATEGORIAS, dinero, etiquetaFechaHora } from './format';

const PAGINA = 25;

const OPCIONES = [
  { valor: '', texto: 'Todas' },
  { valor: 'tarjeta', texto: 'Tarjeta' },
  { valor: 'efectivo', texto: 'Efectivo' },
];

export default function Movimientos({ periodo }: { periodo: string }) {
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<MovimientosPagina | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Al cambiar de periodo volvemos a la primera página.
  useEffect(() => {
    setPagina(0);
  }, [periodo]);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    api
      .movimientos({ periodo, categoria: categoria || null, limit: PAGINA, offset: pagina * PAGINA })
      .then((d) => vigente && setDatos(d))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [periodo, categoria, pagina]);

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / PAGINA)) : 1;

  return (
    <section className="tarjeta movimientos">
      <div className="cabecera-movimientos">
        <h2>Movimientos</h2>
        <div className="filtro">
          <label>
            <span className="suave">Categoría</span>
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setPagina(0);
              }}
            >
              {OPCIONES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.texto}
                </option>
              ))}
            </select>
          </label>
          {datos && <span className="suave">{datos.total} movimientos</span>}
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!error && !datos && <p className="suave">Cargando…</p>}
      {datos && datos.items.length === 0 && <p className="suave">Sin movimientos en este periodo.</p>}

      {datos && datos.items.length > 0 && (
        <>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Establecimiento</th>
                  <th>Categoría</th>
                  <th className="num">Monto</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((m) => (
                  <tr key={m.id}>
                    <td className="fecha">{etiquetaFechaHora(m.fecha_local)}</td>
                    <td className="estab" title={m.establecimiento ?? ''}>
                      {m.establecimiento ?? '—'}
                    </td>
                    <td>
                      <span className={m.categoria === 'efectivo' ? 'pildora verde' : 'pildora'}>
                        {CATEGORIAS[m.categoria] ?? m.categoria}
                      </span>
                    </td>
                    <td className="num">{dinero(m.monto, m.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="paginacion">
            <button className="secundario" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </button>
            <span className="suave">
              Página {pagina + 1} de {totalPaginas}
            </span>
            <button
              className="secundario"
              disabled={pagina + 1 >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
