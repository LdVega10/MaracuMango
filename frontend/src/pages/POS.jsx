import { useState, useEffect } from 'react';
import { productosApi, pedidosApi } from '../services/api';
import './POS.css';

export default function POS() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(null);

  useEffect(() => {
    productosApi.listar().then(r => setProductos(r.data)).catch(console.error);
  }, []);

  function agregar(p) {
    setCarrito(c => {
      const ex = c.find(i => i.id === p.id);
      return ex ? c.map(i => i.id===p.id ? {...i, cantidad: i.cantidad+1} : i)
                : [...c, {...p, cantidad:1}];
    });
  }

  function quitar(id) {
    setCarrito(c => {
      const ex = c.find(i => i.id===id);
      if (!ex) return c;
      return ex.cantidad === 1 ? c.filter(i=>i.id!==id) : c.map(i=>i.id===id?{...i,cantidad:i.cantidad-1}:i);
    });
  }

  const total = carrito.reduce((s,i) => s + i.precio*i.cantidad, 0);

  async function enviar() {
    if (!carrito.length) return;
    setLoading(true);
    try {
      const usuarioId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const { data } = await pedidosApi.crear({
        sede_id:    1,
        canal:      'presencial',
        usuario_id: usuarioId,
        productos:  carrito.map(i => ({ producto_id: i.id, cantidad: i.cantidad })),
      });
      setSuccess(data.id);
      setCarrito([]);
      setTimeout(() => setSuccess(null), 4000);
    } catch(e) { alert('Error al enviar pedido'); }
    setLoading(false);
  }

  return (
    <div className="pos-container">
      <div className="pos-header">
        <h1>🏪 POS Presencial</h1>
        <span>Sede Buenavista</span>
      </div>

      {success && (
        <div className="pos-success">
          ✅ Pedido #{String(success).padStart(3,'0')} enviado a cocina
        </div>
      )}

      <div className="pos-body">
        {/* Productos */}
        <div className="pos-grid">
          {productos.map(p => (
            <button key={p.id} className="pos-product" onClick={() => agregar(p)}>
              <div className="pos-product-icon">🥤</div>
              <div className="pos-product-name">{p.nombre}</div>
              <div className="pos-product-price">${Number(p.precio).toLocaleString()}</div>
              {carrito.find(i=>i.id===p.id) && (
                <div className="pos-qty-badge">{carrito.find(i=>i.id===p.id).cantidad}</div>
              )}
            </button>
          ))}
        </div>

        {/* Carrito */}
        <div className="pos-cart">
          <h3>Pedido actual</h3>
          {carrito.length === 0 && <p className="pos-empty">Selecciona productos →</p>}
          {carrito.map(item => (
            <div className="pos-cart-item" key={item.id}>
              <button className="pos-remove" onClick={() => quitar(item.id)}>−</button>
              <span className="pos-item-qty">{item.cantidad}×</span>
              <span className="pos-item-name">{item.nombre}</span>
              <span className="pos-item-price">${(item.precio*item.cantidad).toLocaleString()}</span>
            </div>
          ))}
          {carrito.length > 0 && (
            <>
              <div className="pos-total">Total: ${total.toLocaleString()}</div>
              <button className="pos-send" onClick={enviar} disabled={loading}>
                {loading ? 'Enviando...' : '🖨️ Enviar a cocina'}
              </button>
              <button className="pos-clear" onClick={() => setCarrito([])}>Limpiar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
