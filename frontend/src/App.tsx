import { useAuth } from './auth';
import Login from './Login';
import Dashboard from './Dashboard';

export default function App() {
  const { email, cargando } = useAuth();
  if (cargando) return <p className="centro suave">Cargando…</p>;
  return email ? <Dashboard /> : <Login />;
}
