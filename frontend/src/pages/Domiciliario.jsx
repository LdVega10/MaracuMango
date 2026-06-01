import { useState, useEffect } from 'react';
import { pedidosApi } from '../services/api';
import './Domiciliario.css';

export default function Domiciliario() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow]         = useState(new Date());

  useEffect(() => {
    cargar();
    const t1 = setInterval(cargar, 10000);
    const t2 = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  async function cargar() {
    try {
      // Trae pedidos listos para entrega (estado listo + domicilio)
      const { data } = await pedidosApi.pendientes(1);
      const domicilios = data.filter(p =>
        p.tipo_entrega === 'domicilio' &&
        (p.estado === 'listo' || p.estado === 'en_preparacion' || p.estado === 'pendiente')
      );
      setPedidos(domicilios);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function marcarEntregado(id) {
    try {
      await pedidosApi.cambiarEstado(id, 'entregado');
      cargar();
    } catch { alert('Error al actualizar'); }
  }

  async function marcarEnCamino(id) {
    try {
      await pedidosApi.cambiarEstado(id, 'listo');
      cargar();
    } catch { alert('Error al actualizar'); }
  }

  const COLORES = {
    pendiente:      { bg: '#FEF9C3', text: '#854F0B', label: 'Preparando' },
    en_preparacion: { bg: '#FEF9C3', text: '#854F0B', label: 'Preparando' },
    listo:          { bg: '#DCFCE7', text: '#166534', label: '¡Listo para salir!' },
  };

  return (
    <div className="dom-container">
      <div className="dom-header">
        <div>
          <h1>🛵 Domicilios – Maracumango</h1>
          <span>Sede Buenavista · {now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}</span>
        </div>
        <div className="dom-count">{pedidos.length} pendiente{pedidos.length !== 1 ? 's' : ''}</div>
      </div>

      {loading && <div className="dom-empty">Cargando pedidos...</div>}

      {!loading && pedidos.length === 0 && (
        <div className="dom-empty">
          <div style={{ fontSize: 56 }}>✅</div>
          <p>Sin domicilios pendientes</p>
          <small>Actualizando cada 10 segundos</small>
        </div>
      )}

      <div className="dom-grid">
        {pedidos.map(p => {
          const est    = COLORES[p.estado] || COLORES.pendiente;
          const mins   = Math.floor((new Date() - new Date(p.created_at)) / 60000);
          const items  = p.items || [];
          const listo  = p.estado === 'listo';

          return (
            <div className={`dom-card ${listo ? 'listo' : ''}`} key={p.id}>
              {/* Badge estado */}
              <div className="dom-badge" style={{ background: est.bg, color: est.text }}>
                {listo ? '🟢' : '🟡'} {est.label}
              </div>

              {/* Número y tiempo */}
              <div className="dom-top">
                <span className="dom-id">#{String(p.id).padStart(3,'0')}</span>
                <span className="dom-time">⏱ {mins} min esperando</span>
              </div>

              {/* Cliente */}
              <div className="dom-section">
                <div className="dom-section-label">👤 Cliente</div>
                <div className="dom-section-value">{p.cliente_nombre || 'Sin nombre'}</div>
                {p.telefono && (
                  <a href={`tel:${p.telefono}`} className="dom-tel">📞 {p.telefono}</a>
                )}
              </div>

              {/* Dirección */}
              <div className="dom-section highlight">
                <div className="dom-section-label">📍 Dirección de entrega</div>
                <div className="dom-direccion">{p.direccion_entrega || 'Sin dirección registrada'}</div>
                {p.direccion_entrega && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion_entrega + ', Santa Marta, Colombia')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dom-maps-btn"
                  >
                    🗺️ Ver en Google Maps
                  </a>
                )}
              </div>

              {/* Productos */}
              <div className="dom-section">
                <div className="dom-section-label">🥤 Productos</div>
                {items.map((item, i) => (
                  <div className="dom-item" key={i}>
                    <span className="dom-item-qty">{item.cantidad}×</span>
                    <span>{item.producto}</span>
                    <span className="dom-item-price">${Number(item.precio * item.cantidad).toLocaleString()}</span>
                  </div>
                ))}
                <div className="dom-total">Total: ${Number(p.total).toLocaleString()}</div>
              </div>

              {/* Acciones */}
              <div className="dom-actions">
                {!listo && (
                  <button className="dom-btn secondary" onClick={() => marcarEnCamino(p.id)}>
                    ✅ Pedido recibido – salir
                  </button>
                )}
                {listo && (
                  <button className="dom-btn primary" onClick={() => marcarEntregado(p.id)}>
                    🏠 Marcar como entregado
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}