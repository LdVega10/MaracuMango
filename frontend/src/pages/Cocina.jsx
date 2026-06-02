import { useState, useEffect } from 'react';
import { pedidosApi } from '../services/api';
import './Cocina.css';

const ESTADOS = {
  pendiente:       { label: 'NUEVO',    next: 'en_preparacion', btnTxt: 'Iniciar preparación', color: '#F5C518' },
  en_preparacion:  { label: 'EN PREP',  next: 'listo',          btnTxt: 'Marcar como listo',   color: '#EF7E1E' },
  listo:           { label: 'LISTO',    next: 'entregado',      btnTxt: 'Entregar ✓',           color: '#1B8C3E' },
};

export default function Cocina() {
  const [pedidos, setPedidos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sedeId]                = useState(1);
  const [now, setNow]           = useState(new Date());

  useEffect(() => {
    cargar();
    const t1 = setInterval(cargar, 10000);  // polling cada 10 seg
    const t2 = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  async function cargar() {
    try {
      const { data } = await pedidosApi.pendientes(sedeId);
      setPedidos(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function avanzar(id, nuevoEstado) {
    try {
      await pedidosApi.cambiarEstado(id, nuevoEstado);
      cargar();
    } catch(e) { alert('Error al actualizar estado'); }
  }

  return (
    <div className="cocina-container">
      <div className="cocina-header">
        <div>
          <h1>👨‍🍳 Cocina – Maracumango</h1>
          <span>Sede Buenavista</span>
        </div>
        <div className="cocina-clock">
          {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {loading && <div className="cocina-loading">Cargando pedidos...</div>}

      {!loading && pedidos.length === 0 && (
        <div className="cocina-empty">
          <div style={{ fontSize: 60 }}>✅</div>
          <p>Sin pedidos pendientes</p>
          <small>Actualizando cada 10 segundos...</small>
        </div>
      )}

      <div className="cocina-grid">
        {pedidos.map(p => {
          const est = ESTADOS[p.estado] || ESTADOS.pendiente;
          const mins = Math.floor((new Date() - new Date(p.created_at)) / 60000);
          return (
            <div className="pedido-card" key={p.id} style={{ borderTopColor: est.color }}>
              <div className="pedido-header">
                <span className="pedido-id">#{String(p.id).padStart(3,'0')}</span>
                <span className="pedido-badge" style={{ background: est.color + '33', color: est.color }}>
                  {est.label}
                </span>
              </div>
              <div className="pedido-meta">
                {p.canal === 'chatbot' ? '📱 Web' : '🏪 Presencial'} · {mins}min
              </div>
              {p.cliente_nombre && (
                <div className="pedido-cliente">👤 {p.cliente_nombre}</div>
              )}
              {p.metodo_pago && (
                <div className="pedido-pago">💳 {
                  p.metodo_pago === 'nequi' ? '📱 Nequi' :
                  p.metodo_pago === 'bancolombia' ? '🏦 Bancolombia' :
                  p.metodo_pago === 'daviplata' ? '💜 Daviplata' :
                  p.metodo_pago === 'efectivo' ? '💵 Efectivo' : p.metodo_pago
                }</div>
              )}
              <div className="pedido-items">
                {(p.items || []).map((item, i) => (
                  <div className="pedido-item" key={i}>
                    <span className="item-qty">{item.cantidad}×</span>
                    <span>{item.producto}</span>
                  </div>
                ))}
              </div>
              <div className="pedido-total">Total: ${Number(p.total).toLocaleString()}</div>
              {ESTADOS[p.estado]?.next && (
                <button
                  className="btn-avanzar"
                  style={{ background: est.color }}
                  onClick={() => avanzar(p.id, est.next)}
                >
                  {est.btnTxt}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}