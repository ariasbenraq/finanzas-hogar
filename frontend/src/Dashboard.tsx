import { useEffect, useState } from 'react';
import { api, type Periodo } from './api';
import { useAuth } from './auth';

// Pantalla provisional: confirma que la sesión y las llamadas a la API funcionan.
// En las sesiones 8 a 10 se reemplaza por las tarjetas, los gráficos y la tabla.
export default function Dashboard() {
  const { email, logout } = useAuth();
  const [periodos, setPeriodos] = useState<Periodo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .periodos()
      .then(setPeriodos)
      .catch((e: Error) => setError(e.message));
  }, []);

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
        <section className="tarjeta">
          <h2>Periodos disponibles</h2>
          {error && <p className="error">{error}</p>}
          {!error && !periodos && <p className="suave">Cargando…</p>}
          {periodos && (
            <ul className="lista">
              {periodos.map((p) => (
                <li key={p.periodo}>
                  <span>{p.periodo}</span>
                  <span className="suave">
                    {p.consumos} consumos
                    {p.actual ? ' · actual' : ''}
                    {p.parcial ? ' · parcial' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
