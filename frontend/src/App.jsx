import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Login           from './pages/Login';
import Chatbot         from './components/Chatbot';
import Cocina          from './pages/Cocina';
import Dashboard       from './pages/Dashboard';
import POS             from './pages/POS';
import Domiciliario    from './pages/Domiciliario';
import GestionUsuarios from './pages/GestionUsuarios';
import './index.css';

// Rutas permitidas por rol
const ROL_RUTAS = {
  admin:        ['/dashboard', '/usuarios', '/chatbot'],
  mesera:       ['/pos'],
  cocinero:     ['/cocina'],
  cajera:       ['/pos'],
  domiciliario: ['/domiciliario'],
};

function redirectByRol(rol, navigate) {
  const rutas = {
    admin:        '/dashboard',
    mesera:       '/pos',
    cocinero:     '/cocina',
    cajera:       '/pos',
    domiciliario: '/domiciliario',
  };
  navigate(rutas[rol] || '/');
}

function AppContent() {
  const [rol, setRol]     = useState(null);
  const [user, setUser]   = useState(null);
  const navigate          = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u     = localStorage.getItem('user');
    if (token && u) {
      const parsed = JSON.parse(u);
      setRol(parsed.rol);
      setUser(parsed);
    }
  }, []);

  function handleLogin(rolRecibido) {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setRol(rolRecibido);
    setUser(u);
    redirectByRol(rolRecibido, navigate);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setRol(null);
    setUser(null);
    navigate('/login');
  }

  if (!rol) {
    return (
      <Routes>
        <Route path="/chatbot" element={<Chatbot sedeId={1} />} />
        <Route path="*"        element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <>
      {/* Logout bottom left */}
      <div style={{
        position:'fixed', bottom:0, left:0, zIndex:999,
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 16px', background:'rgba(0,0,0,.6)',
        borderTopRightRadius:12
      }}>
        <span style={{color:'#D1D5DB', fontSize:12}}>{user?.nombre} · <strong style={{color:'white'}}>{rol}</strong></span>
        <button onClick={handleLogout} style={{
          padding:'5px 14px', background:'#DC2626', color:'white',
          border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit'
        }}>Salir</button>
      </div>

      <Routes>
        {/* Admin */}
        {rol === 'admin' && <>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/usuarios"  element={<GestionUsuarios />} />
          <Route path="/chatbot"   element={<Chatbot sedeId={1} />} />
          <Route path="*"          element={<Dashboard />} />
        </>}
        {/* Mesera / Cajera */}
        {(rol === 'mesera' || rol === 'cajera') && <>
          <Route path="/pos"  element={<POS />} />
          <Route path="*"     element={<POS />} />
        </>}
        {/* Cocinero */}
        {rol === 'cocinero' && <>
          <Route path="/cocina" element={<Cocina />} />
          <Route path="*"       element={<Cocina />} />
        </>}
        {/* Domiciliario */}
        {rol === 'domiciliario' && <>
          <Route path="/domiciliario" element={<Domiciliario />} />
          <Route path="*"             element={<Domiciliario />} />
        </>}
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}