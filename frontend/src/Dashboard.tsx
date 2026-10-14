import { useEffect, useState } from 'react';
import { api, type Periodo, type Resumen } from './api';
import { useAuth } from './auth';
import SelectorPeriodo from './SelectorPeriodo';
import Tarjetas from './Tarjetas';

export default function Dashboard() {
  const { email, logout } = useAuth();
  const [periodos, setPeriodos] = useState<Periodo[] | null>(null);
  const [periodo, setPeriodo] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
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

  // Resumen del periodo seleccionado. Se descarta la respuesta si cambió el periodo mientras cargaba.
  useEffect(() => {
    if (!periodo) return;
    let vigente = true;
    setResumen(null);
    setError(null);
    api
      .resumen(periodo)
      .then((r) => vigente && setResumen(r))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [periodo]);

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
        {periodos && periodos.length > 0 && (
          <SelectorPeriodo periodos={periodos} valor={periodo} onChange={setPeriodo} />
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!error && !resumen && <p className="suave">Cargando…</p>}
        {resumen && <Tarjetas resumen={resumen} />}
      </main>
    </>
  );
}
