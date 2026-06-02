import { useState } from 'react';
import { authApi } from '../services/api';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ nombre: data.nombre, rol: data.rol, sede_id: data.sede_id }));
      onLogin(data.rol);
    } catch {
      setError('Correo o contraseña incorrectos');
    }
    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">M</div>
        <h1 className="login-brand">MARACUMANGO</h1>
        <p className="login-sub">Sistema de Gestión</p>

        {error && <div className="login-error">{error}</div>}

        <div className="login-field">
          <label>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="correo@maracumango.com"
            autoFocus
          />
        </div>

        <div className="login-field">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
          />
        </div>

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}