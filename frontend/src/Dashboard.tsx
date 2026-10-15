import { useEffect, useState } from 'react';
import { api, type Banco, type Diario, type Periodo, type Resumen } from './api';
import { useAuth } from './auth';
import SelectorPeriodo from './SelectorPeriodo';
import Ciclo from './Ciclo';
import Presupuesto from './Presupuesto';
import BancoCard from './Banco';
import Tarjetas from './Tarjetas';
import Graficos from './Graficos';
import GraficosCategorias from './GraficosCategorias';
import Movimientos from './Movimientos';

export default function Dashboard() {
  const { email, logout } = useAuth();
  const [periodos, setPeriodos] = useState<Periodo[] | null>(null);
  const [periodo, setPeriodo] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [diario, setDiario] = useState<Diario | null>(null);
  const [banco, setBanco] = useState<Banco | null>(null);
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

  // Estado de la línea del banco (no depende del periodo).
  useEffect(() => {
    api
      .banco()
      .then(setBanco)
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

        {resumen && <Ciclo resumen={resumen} />}
        {resumen && <Presupuesto datos={resumen.presupuesto} />}
        {resumen && <BancoCard resumen={resumen} banco={banco} onGuardado={setBanco} />}
        {resumen && <Tarjetas resumen={resumen} />}
        {resumen?.gastos_categoria && resumen.gastos_categoria.length > 0 && (
          <GraficosCategorias datos={resumen.gastos_categoria} />
        )}
        {diario && <Graficos series={diario.series} />}
        {periodo && <Movimientos periodo={periodo} />}
      </main>
    </>
  );
}
