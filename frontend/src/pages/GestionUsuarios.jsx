import { useState, useEffect } from 'react';
import API from '../services/api';
import './GestionUsuarios.css';

const ROLES = ['mesera','cocinero','cajera','domiciliario','admin'];
const SEDES = [
  { id:1, nombre:'Buenavista' },
  { id:2, nombre:'Centro'     },
  { id:3, nombre:'Rodadero'   },
  { id:4, nombre:'Pescado'    },
];

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ nombre:'', email:'', password:'', rol:'mesera', sede_id:1 });
  const [loading, setLoading]   = useState(false);
  const [exito, setExito]       = useState('');
  const [error, setError]       = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    try {
      const { data } = await API.get('/api/usuarios');
      setUsuarios(data);
    } catch(e) { console.error(e); }
  }

  async function crear() {
    if (!form.nombre || !form.email || !form.password) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      await API.post('/api/usuarios', form);
      setExito(`✅ Usuario ${form.nombre} creado exitosamente`);
      setModal(false);
      setForm({ nombre:'', email:'', password:'', rol:'mesera', sede_id:1 });
      cargar();
      setTimeout(() => setExito(''), 3000);
    } catch(e) {
      setError(e.response?.data?.message || 'Error al crear usuario');
    }
    setLoading(false);
  }

  async function eliminar(id, nombre) {
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return;
    try {
      await API.delete(`/api/usuarios/${id}`);
      cargar();
    } catch { alert('Error al eliminar'); }
  }

  const rolColor = { admin:'#1B8C3E', mesera:'#2563EB', cocinero:'#EF7E1E', cajera:'#8B5CF6', domiciliario:'#F5C518' };
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="gu-container">
      <div className="gu-header">
        <div>
          <h1>👥 Gestión de Usuarios</h1>
          <p>Solo administradores · {user.nombre}</p>
        </div>
        <button className="gu-btn-crear" onClick={() => { setError(''); setModal(true); }}>
          + Crear usuario
        </button>
      </div>

      {exito && <div className="gu-exito">{exito}</div>}

      <div className="gu-table">
        <div className="gu-thead">
          <span>Nombre</span>
          <span>Correo</span>
          <span>Rol</span>
          <span>Sede</span>
          <span>Acción</span>
        </div>
        {!usuarios.length && <div className="gu-empty">Sin usuarios registrados</div>}
        {usuarios.map(u => (
          <div className="gu-row" key={u.id}>
            <span className="gu-nombre">{u.nombre}</span>
            <span className="gu-email">{u.email}</span>
            <span className="gu-rol" style={{ background: rolColor[u.rol]+'22', color: rolColor[u.rol] }}>
              {u.rol}
            </span>
            <span className="gu-sede">{SEDES.find(s=>s.id===u.sede_id)?.nombre || '-'}</span>
            <button className="gu-btn-del" onClick={() => eliminar(u.id, u.nombre)}>Eliminar</button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>👤 Crear nuevo usuario</h2>

            {error && <div className="login-error">{error}</div>}

            <div className="modal-field">
              <label>Nombre completo</label>
              <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre del empleado"/>
            </div>
            <div className="modal-field">
              <label>Correo electrónico</label>
              <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="correo@maracumango.com"/>
            </div>
            <div className="modal-field">
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mínimo 6 caracteres"/>
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label>Rol</label>
                <select value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value}))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <label>Sede</label>
                <select value={form.sede_id} onChange={e=>setForm(f=>({...f,sede_id:Number(e.target.value)}))}>
                  {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="modal-btn save" onClick={crear} disabled={loading}>
                {loading ? 'Creando...' : '✅ Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}