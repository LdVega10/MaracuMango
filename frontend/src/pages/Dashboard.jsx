import { useState, useEffect } from 'react';
import { ventasApi, pedidosApi, inventarioApi } from '../services/api';
import API from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Dashboard.css';

const SEDES  = [
  { id:1, nombre:'Buenavista' },
  { id:2, nombre:'Centro'     },
  { id:3, nombre:'Rodadero'   },
  { id:4, nombre:'Pescado'    },
];
const DIRS = ['Frente al C.C. Buenavista','Centro Histórico','El Rodadero','Barrio El Pescado'];
const COLORES = ['#1B8C3E','#38C761','#F5C518','#EF7E1E'];

export default function Dashboard() {
  const [seccion, setSeccion]   = useState('resumen');
  const [fecha, setFecha]       = useState(new Date().toISOString().split('T')[0]);
  const [ventas, setVentas]     = useState(null);
  const [pedidos, setPedidos]   = useState([]);
  const [todosPed, setTodosPed] = useState([]);
  const [inventario, setInv]    = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [sedeInv, setSedeInv]   = useState(1);
  const [sedePed, setSedePed]   = useState(1);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { cargarResumen(); }, [fecha]);
  useEffect(() => { if (seccion==='pedidos')    cargarPedidos();    }, [seccion, sedePed]);
  useEffect(() => { if (seccion==='inventario') cargarInventario(); }, [seccion, sedeInv]);
  useEffect(() => { if (seccion==='usuarios')   cargarUsuarios();   }, [seccion]);

  async function cargarResumen() {
    setLoading(true);
    try {
      const [v, p] = await Promise.all([ventasApi.resumen('all', fecha), pedidosApi.pendientes(1)]);
      setVentas(v.data); setPedidos(p.data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function cargarPedidos() {
    setLoading(true);
    try { const { data } = await pedidosApi.pendientes(sedePed); setTodosPed(data); }
    catch(e) { console.error(e); }
    setLoading(false);
  }

  async function cargarInventario() {
    setLoading(true);
    try { const { data } = await inventarioApi.listar(sedeInv); setInv(data); }
    catch(e) { console.error(e); }
    setLoading(false);
  }

  async function cargarUsuarios() {
    setLoading(true);
    try { const { data } = await API.get('/api/usuarios'); setUsuarios(data); }
    catch(e) { console.error(e); }
    setLoading(false);
  }

  async function cambiarEstado(id, estado) {
    try { await pedidosApi.cambiarEstado(id, estado); cargarPedidos(); }
    catch { alert('Error al actualizar estado'); }
  }

  const nav = [
    { key:'resumen',    label:'📊 Resumen'    },
    { key:'pedidos',    label:'📦 Pedidos'    },
    { key:'sedes',      label:'🏪 Sedes'      },
    { key:'inventario', label:'📋 Inventario' },
    { key:'usuarios',   label:'👥 Usuarios'   },
  ];

  return (
    <div className="dash-container">
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <div className="dash-logo-circle">M</div>
          <div>
            <div className="dash-brand">MARACUMANGO</div>
            <div className="dash-role">Panel Admin</div>
          </div>
        </div>
        {nav.map(n => (
          <div key={n.key}
            className={`dash-nav-item ${seccion===n.key?'active':''}`}
            onClick={() => { setSeccion(n.key); setLoading(true); }}
          >{n.label}</div>
        ))}
      </aside>

      <main className="dash-main">

        {/* RESUMEN */}
        {seccion === 'resumen' && <>
          <div className="dash-topbar">
            <div><h1>Resumen del día</h1><p className="dash-sub">Todas las sedes · Tiempo real</p></div>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="dash-date"/>
          </div>
          {loading && <div className="dash-loading">Cargando...</div>}
          {!loading && ventas && <>
            <div className="metrics-grid">
              <MetricCard label="Ventas totales"   value={`$${Number(ventas.total_ventas).toLocaleString()}`} sub="del día" color="#1B8C3E"/>
              <MetricCard label="Pedidos"           value={ventas.total_pedidos} sub={`${ventas.pedidos_web} web · ${ventas.pedidos_presencial} presencial`} color="#F5C518"/>
              <MetricCard label="Canal web"         value={ventas.pedidos_web}        sub="vía chatbot"    color="#38C761"/>
              <MetricCard label="Canal presencial"  value={ventas.pedidos_presencial} sub="punto de venta" color="#EF7E1E"/>
            </div>
            <div className="charts-row">
              <div className="dash-card chart-card">
                <h3>Ventas por sede</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ventas.por_sede} margin={{top:10,right:10,left:0,bottom:0}}>
                    <XAxis dataKey="sede" tick={{fontSize:12}}/>
                    <YAxis tick={{fontSize:11}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={v=>[`$${Number(v).toLocaleString()}`,'Ventas']}/>
                    <Bar dataKey="ventas" radius={[6,6,0,0]}>
                      {ventas.por_sede.map((_,i)=><Cell key={i} fill={COLORES[i%COLORES.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="dash-card">
                <h3>Top productos hoy</h3>
                <div className="top-products">
                  {(ventas.top_productos||[]).map((p,i)=>(
                    <div className="top-product-row" key={i}>
                      <span className="top-rank">{i+1}</span>
                      <span className="top-name">{p.nombre}</span>
                      <span className="top-units">{p.unidades} uds</span>
                      <span className="top-revenue">${Number(p.ingresos).toLocaleString()}</span>
                    </div>
                  ))}
                  {!ventas.top_productos?.length && <p className="dash-empty">Sin ventas aún</p>}
                </div>
              </div>
            </div>
            <div className="dash-card">
              <h3>Pedidos pendientes ({pedidos.length})</h3>
              {!pedidos.length && <p className="dash-empty">Sin pedidos pendientes ✅</p>}
              <div className="pedidos-table">
                {pedidos.map(p=>(
                  <div className="pedido-row" key={p.id}>
                    <span className="pr-id">#{String(p.id).padStart(3,'0')}</span>
                    <span className="pr-cliente">{p.cliente_nombre||'Presencial'}</span>
                    <span className="pr-canal">{p.canal==='chatbot'?'📱 Web':'🏪 Local'}</span>
                    <span className="pr-total">${Number(p.total).toLocaleString()}</span>
                    <span className={`pr-estado ${p.estado}`}>{p.estado.replace('_',' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </>}
        </>}

        {/* PEDIDOS */}
        {seccion === 'pedidos' && <>
          <div className="dash-topbar">
            <div><h1>Pedidos activos</h1><p className="dash-sub">Gestión en tiempo real</p></div>
            <select className="dash-select" value={sedePed} onChange={e=>setSedePed(Number(e.target.value))}>
              {SEDES.map(s=><option key={s.id} value={s.id}>Sede {s.nombre}</option>)}
            </select>
          </div>
          {loading && <div className="dash-loading">Cargando pedidos...</div>}
          {!loading && <>
            {!todosPed.length && <div className="dash-empty-box">✅ Sin pedidos activos en esta sede</div>}
            <div className="pedidos-full">
              {todosPed.map(p=>(
                <div className="pedido-full-card" key={p.id}>
                  <div className="pfc-header">
                    <span className="pfc-id">#{String(p.id).padStart(3,'0')}</span>
                    <span className={`pfc-estado ${p.estado}`}>{p.estado.replace('_',' ')}</span>
                    <span className="pfc-canal">{p.canal==='chatbot'?'📱 Web':'🏪 Presencial'}</span>
                    {p.tipo_entrega==='domicilio' && <span className="pfc-dom">🛵 Domicilio</span>}
                  </div>
                  {p.cliente_nombre && <div className="pfc-cliente">👤 {p.cliente_nombre}{p.telefono&&` · ${p.telefono}`}</div>}
                  {p.direccion_entrega && <div className="pfc-dir">📍 {p.direccion_entrega}</div>}
                  {p.metodo_pago && <div className="pfc-dir" style={{color:'#8B5CF6'}}>💳 {
                    p.metodo_pago === 'nequi' ? '📱 Nequi' :
                    p.metodo_pago === 'bancolombia' ? '🏦 Bancolombia' :
                    p.metodo_pago === 'daviplata' ? '💜 Daviplata' :
                    p.metodo_pago === 'efectivo' ? '💵 Efectivo' : p.metodo_pago
                  }</div>}
                  <div className="pfc-items">
                    {(p.items||[]).map((item,i)=>(
                      <span key={i} className="pfc-item">{item.cantidad}× {item.producto}</span>
                    ))}
                  </div>
                  <div className="pfc-footer">
                    <span className="pfc-total">${Number(p.total).toLocaleString()}</span>
                    <div className="pfc-actions">
                      {p.estado==='pendiente'      && <button className="pfc-btn yellow" onClick={()=>cambiarEstado(p.id,'en_preparacion')}>Iniciar prep.</button>}
                      {p.estado==='en_preparacion' && <button className="pfc-btn green"  onClick={()=>cambiarEstado(p.id,'listo')}>Marcar listo</button>}
                      {p.estado==='listo'          && <button className="pfc-btn green"  onClick={()=>cambiarEstado(p.id,'entregado')}>Entregado ✓</button>}
                      <button className="pfc-btn red" onClick={()=>cambiarEstado(p.id,'cancelado')}>Cancelar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </>}

        {/* SEDES */}
        {seccion === 'sedes' && <>
          <div className="dash-topbar">
            <div><h1>Sedes</h1><p className="dash-sub">Información de los 4 puntos de venta</p></div>
          </div>
          <div className="sedes-grid">
            {SEDES.map((s,i)=>(
              <div className="sede-card" key={s.id} style={{borderTopColor:COLORES[i]}}>
                <div className="sede-num" style={{color:COLORES[i]}}>#{s.id}</div>
                <div className="sede-nombre">{s.nombre}</div>
                <div className="sede-info">
                  <div className="sede-row"><span>📍</span><span>{DIRS[i]}, Santa Marta</span></div>
                  <div className="sede-row"><span>👥</span><span>2–3 empleados</span></div>
                  <div className="sede-row"><span>⏰</span><span>Lun–Dom 10am–10pm</span></div>
                  <div className="sede-row"><span>🌐</span><span>Internet estable</span></div>
                </div>
                <div className="sede-badge">🟢 Activa</div>
                <button className="sede-btn" onClick={()=>{ setSedeInv(s.id); setSeccion('inventario'); }}>
                  Ver inventario →
                </button>
              </div>
            ))}
          </div>
        </>}

        {/* INVENTARIO */}
        {seccion === 'inventario' && (
          <InventarioSection
            sedeInv={sedeInv} setSedeInv={setSedeInv}
            inventario={inventario} loading={loading}
            recargar={cargarInventario}
          />
        )}

        {/* USUARIOS */}
        {seccion === 'usuarios' && (
          <UsuariosSection
            usuarios={usuarios}
            loading={loading}
            recargar={cargarUsuarios}
          />
        )}

      </main>
    </div>
  );
}

function InventarioSection({ sedeInv, setSedeInv, inventario, loading, recargar }) {
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ insumo:'', cantidad:'', unidad:'kg' });
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito]       = useState('');

  function abrirRellenar(item) {
    setForm({ insumo: item.insumo, cantidad: '', unidad: item.unidad });
    setModal(true);
  }

  async function guardar() {
    if (!form.insumo || !form.cantidad) return;
    setGuardando(true);
    try {
      await inventarioApi.guardar({ sede_id: sedeInv, insumo: form.insumo, cantidad: Number(form.cantidad), unidad: form.unidad });
      setExito(`✅ ${form.insumo} actualizado a ${form.cantidad} ${form.unidad}`);
      setModal(false);
      setForm({ insumo:'', cantidad:'', unidad:'kg' });
      recargar();
      setTimeout(() => setExito(''), 3000);
    } catch { alert('Error al guardar'); }
    setGuardando(false);
  }

  return (
    <>
      <div className="dash-topbar">
        <div><h1>Inventario</h1><p className="dash-sub">Stock de insumos por sede</p></div>
        <div style={{display:'flex', gap:10}}>
          <select className="dash-select" value={sedeInv} onChange={e=>setSedeInv(Number(e.target.value))}>
            {SEDES.map(s=><option key={s.id} value={s.id}>Sede {s.nombre}</option>)}
          </select>
          <button className="btn-rellenar" onClick={()=>{ setForm({insumo:'',cantidad:'',unidad:'kg'}); setModal(true); }}>
            📦 Rellenar inventario
          </button>
        </div>
      </div>

      {exito && <div className="inv-exito">{exito}</div>}
      {loading && <div className="dash-loading">Cargando inventario...</div>}

      {!loading && (
        <div className="dash-card">
          <h3>Insumos – Sede {SEDES.find(s=>s.id===sedeInv)?.nombre}</h3>
          {!inventario.length && <p className="dash-empty">Sin registros de inventario para esta sede</p>}
          <div className="inv-table">
            {inventario.map((item,i)=>{
              const pct   = Math.min(100,(item.cantidad/200)*100);
              const color = pct>50?'#1B8C3E':pct>20?'#F5C518':'#DC2626';
              return (
                <div className="inv-row" key={i}>
                  <div className="inv-info">
                    <span className="inv-nombre">{item.insumo}</span>
                    <span className="inv-qty">{item.cantidad} {item.unidad}</span>
                  </div>
                  <div className="inv-bar-bg">
                    <div className="inv-bar-fill" style={{width:`${pct}%`,background:color}}/>
                  </div>
                  <span className="inv-status" style={{color}}>
                    {pct>50?'✅ OK':pct>20?'⚠️ Bajo':'🔴 Crítico'}
                  </span>
                  <button className="inv-btn-rellenar" onClick={()=>abrirRellenar(item)}>+</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h2>📦 Rellenar inventario</h2>
            <p className="modal-sub">Sede {SEDES.find(s=>s.id===sedeInv)?.nombre}</p>
            <div className="modal-field">
              <label>Insumo</label>
              <input value={form.insumo} onChange={e=>setForm(f=>({...f,insumo:e.target.value}))}
                placeholder="Ej: Maracuyá, Mango, Leche..." list="insumos-list"/>
              <datalist id="insumos-list">
                {inventario.map(i=><option key={i.insumo} value={i.insumo}/>)}
              </datalist>
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label>Cantidad</label>
                <input type="number" min="0" value={form.cantidad}
                  onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} placeholder="0"/>
              </div>
              <div className="modal-field">
                <label>Unidad</label>
                <select value={form.unidad} onChange={e=>setForm(f=>({...f,unidad:e.target.value}))}>
                  <option value="kg">kg</option>
                  <option value="litros">litros</option>
                  <option value="unidades">unidades</option>
                  <option value="gramos">gramos</option>
                  <option value="libras">libras</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="modal-btn save" onClick={guardar} disabled={guardando||!form.insumo||!form.cantidad}>
                {guardando?'Guardando...':'✅ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UsuariosSection({ usuarios, loading, recargar }) {
  const SEDES = [{id:1,nombre:'Buenavista'},{id:2,nombre:'Centro'},{id:3,nombre:'Rodadero'},{id:4,nombre:'Pescado'}];
  const ROLES = ['mesera','cocinero','cajera','domiciliario','admin'];
  const ROL_COLOR = { admin:'#1B8C3E', mesera:'#2563EB', cocinero:'#EF7E1E', cajera:'#8B5CF6', domiciliario:'#F5C518' };

  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ nombre:'', email:'', password:'', rol:'mesera', sede_id:1 });
  const [saving, setSaving] = useState(false);
  const [exito, setExito]   = useState('');
  const [error, setError]   = useState('');

  async function crear() {
    if (!form.nombre || !form.email || !form.password) { setError('Completa todos los campos'); return; }
    setSaving(true); setError('');
    try {
      await API.post('/api/usuarios', form);
      setExito(`✅ Usuario ${form.nombre} creado`);
      setModal(false);
      setForm({ nombre:'', email:'', password:'', rol:'mesera', sede_id:1 });
      recargar();
      setTimeout(() => setExito(''), 3000);
    } catch(e) {
      setError(e.response?.data?.message || 'Error al crear usuario');
    }
    setSaving(false);
  }

  async function eliminar(id, nombre) {
    if (!window.confirm(`¿Desactivar a ${nombre}?`)) return;
    try { await API.delete(`/api/usuarios/${id}`); recargar(); }
    catch { alert('Error al eliminar'); }
  }

  return (
    <>
      <div className="dash-topbar">
        <div><h1>Gestión de Usuarios</h1><p className="dash-sub">Solo administradores · Crear y gestionar empleados</p></div>
        <button className="btn-rellenar" onClick={() => { setError(''); setModal(true); }}>+ Crear usuario</button>
      </div>

      {exito && <div className="inv-exito">{exito}</div>}
      {loading && <div className="dash-loading">Cargando usuarios...</div>}

      {!loading && (
        <div className="dash-card">
          <h3>Empleados activos ({usuarios.filter(u=>u.activo).length})</h3>
          <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:12}}>
            {!usuarios.length && <p className="dash-empty">Sin usuarios registrados</p>}
            {usuarios.filter(u=>u.activo).map(u => (
              <div key={u.id} style={{display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--off-white)', borderRadius:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:ROL_COLOR[u.rol]||'#ccc',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:14,flexShrink:0}}>
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{u.nombre}</div>
                  <div style={{fontSize:12,color:'var(--gray)'}}>{u.email}</div>
                </div>
                <span style={{padding:'4px 10px',borderRadius:12,fontSize:12,fontWeight:700,background:(ROL_COLOR[u.rol]||'#ccc')+'22',color:ROL_COLOR[u.rol]||'#333'}}>
                  {u.rol}
                </span>
                <span style={{fontSize:12,color:'var(--gray)',minWidth:80}}>{SEDES.find(s=>s.id===u.sede_id)?.nombre||'-'}</span>
                <button onClick={() => eliminar(u.id, u.nombre)} style={{padding:'5px 12px',background:'#FEE2E2',color:'#991B1B',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  Desactivar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>👤 Crear nuevo usuario</h2>
            <p className="modal-sub">El usuario podrá ingresar con su correo y contraseña</p>
            {error && <div style={{background:'#FEE2E2',color:'#991B1B',padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:500}}>{error}</div>}
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
                  {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <label>Sede</label>
                <select value={form.sede_id} onChange={e=>setForm(f=>({...f,sede_id:Number(e.target.value)}))}>
                  {SEDES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="modal-btn save" onClick={crear} disabled={saving}>
                {saving ? 'Creando...' : '✅ Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="metric-card" style={{ borderTopColor: color }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}