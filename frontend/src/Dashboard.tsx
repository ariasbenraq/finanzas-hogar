import { useEffect, useState } from 'react';
import { api, type Diario, type Periodo, type Resumen } from './api';
import { useAuth } from './auth';
import SelectorPeriodo from './SelectorPeriodo';
import Tarjetas from './Tarjetas';
import Graficos from './Graficos';
import Movimientos from './Movimientos';

export default function Dashboard() {
  const { email, logout } = useAuth();
  const [periodos, setPeriodos] = useState<Periodo[] | null>(null);
  const [periodo, setPeriodo] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [diario, setDiario] = useState<Diario | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista de periodos; arranca en el actual (o en el más reciente si no hubiera).
  useEffect(() => {
    api
      .periodos()
      .then((ps) => {
        setPeriodos(ps);
        setPeriodo((ps.find((p) => p.actual) ?? ps[0])?.periodo ?? '');
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  // Resumen y serie diaria del periodo seleccionado. Se descarta la respuesta si el periodo cambió.
  useEffect(() => {
    if (!periodo) return;
    let vigente = true;
    setResumen(null);
    setDiario(null);
    setError(null);
    Promise.all([api.resumen(periodo), api.diario(periodo)])
      .then(([r, d]) => {
        if (!vigente) return;
        setResumen(r);
        setDiario(d);
      })
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [periodo]);

  const cargando = !error && (!resumen || !diario);

  return (
    <>
      <header className="barra">
        <strong>Finanzas</strong>
        <span className="suave correo">{email}</span>
        <button className="secundario" onClick={() => void logout()}>
          Salir
        </button>
      </header>

      <main className="contenido">
        <h1 className="titulo">Consumos</h1>

        <div className="herramientas">
          {periodos && periodos.length > 0 && (
            <SelectorPeriodo periodos={periodos} valor={periodo} onChange={setPeriodo} />
          )}
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {cargando && <p className="suave">Cargando…</p>}

        {resumen && <Tarjetas resumen={resumen} />}
        {diario && <Graficos series={diario.series} />}
        {periodo && <Movimientos periodo={periodo} />}
      </main>
    </>
  );
}
