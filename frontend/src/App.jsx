import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Chatbot      from './components/Chatbot';
import Cocina       from './pages/Cocina';
import Dashboard    from './pages/Dashboard';
import POS          from './pages/POS';
import Domiciliario from './pages/Domiciliario';
import './index.css';

function Home() {
  return (
    <div style={{ minHeight:'100vh', background:'#0F1E13', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:32, padding:24 }}>
      <div style={{ textAlign:'center', color:'white' }}>
        <div style={{ fontSize:64, marginBottom:8 }}>🥤</div>
        <h1 style={{ fontSize:32, fontWeight:800, color:'#F5C518', marginBottom:4 }}>MARACUMANGO</h1>
        <p style={{ color:'#9CA3AF', fontSize:15 }}>Santa Marta · Sistema de Gestión MVP</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:320 }}>
        {[
          { to:'/chatbot',      label:'🛒 Chatbot de Pedidos',       desc:'Canal web para clientes' },
          { to:'/pos',          label:'🏪 POS Presencial',           desc:'Para la mesera' },
          { to:'/cocina',       label:'👨‍🍳 Pantalla de Cocina',      desc:'Vista del cocinero' },
          { to:'/domiciliario', label:'🛵 Domicilios',               desc:'Vista del domiciliario' },
          { to:'/dashboard',    label:'📊 Dashboard Admin',           desc:'Panel de la dueña' },
        ].map(item => (
          <Link to={item.to} key={item.to} style={{ textDecoration:'none' }}>
            <div style={{ background:'#1a2b1d', borderRadius:14, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'background .15s' }}>
              <div>
                <div style={{ color:'white', fontWeight:600, fontSize:15 }}>{item.label}</div>
                <div style={{ color:'#9CA3AF', fontSize:12, marginTop:2 }}>{item.desc}</div>
              </div>
              <span style={{ color:'#38C761', fontSize:18 }}>→</span>
            </div>
          </Link>
        ))}
      </div>
      <p style={{ color:'#4B5563', fontSize:12 }}>Electiva II: Arquitectura Empresarial de TI · 2025</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/chatbot"   element={<Chatbot sedeId={1} />} />
        <Route path="/cocina"       element={<Cocina />} />
        <Route path="/domiciliario" element={<Domiciliario />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/pos"       element={<POS />} />
      </Routes>
    </BrowserRouter>
  );
}