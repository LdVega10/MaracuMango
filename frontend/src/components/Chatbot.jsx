import { useState, useEffect, useRef } from 'react';
import { clientesApi, productosApi, recomendacionesApi, pedidosApi } from '../services/api';
import './Chatbot.css';

const STEPS = {
  PEDIR_TELEFONO:  'PEDIR_TELEFONO',
  MOSTRAR_MENU:    'MOSTRAR_MENU',
  TIPO_ENTREGA:    'TIPO_ENTREGA',
  PEDIR_PAGO:      'PEDIR_PAGO',
  PEDIR_DIRECCION: 'PEDIR_DIRECCION',
  PEDIDO_OK:       'PEDIDO_OK',
};

const METODOS_PAGO = [
  { id:'nequi',       label:'📱 Nequi'       },
  { id:'bancolombia', label:'🏦 Bancolombia' },
  { id:'daviplata',   label:'💜 Daviplata'   },
  { id:'efectivo',    label:'💵 Efectivo'    },
];

function calcularTiempo(carrito, tipo) {
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  const prepMin    = 3 + totalItems * 5;
  const entregaMin = tipo === 'domicilio' ? 15 : 0;
  return { prepMin, entregaMin, total: prepMin + entregaMin };
}

export default function Chatbot({ sedeId = 1 }) {
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState('');
  const [step, setStep]                       = useState(STEPS.PEDIR_TELEFONO);
  const [cliente, setCliente]                 = useState(null);
  const [productos, setProductos]             = useState([]);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [carrito, setCarrito]                 = useState([]);
  const [carritoFinal, setCarritoFinal]       = useState([]);
  const [metodoPago, setMetodoPago]           = useState('');
  const [tipoEntregaFinal, setTipoEntregaFinal] = useState('punto');
  const [loading, setLoading]                 = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    addBot('¡Hola! 👋 Bienvenido a **Maracumango** Santa Marta 🥤\n¿Cuál es tu número de celular para identificarte?');
  }, []);

  const addBot  = (text) => setMessages(m => [...m, { from:'bot',  text, ts: new Date() }]);
  const addUser = (text) => setMessages(m => [...m, { from:'user', text, ts: new Date() }]);

  async function handleSend(texto = input) {
    const val = texto.trim();
    if (!val) return;
    setInput('');
    addUser(val);
    if (step === STEPS.PEDIR_TELEFONO)  await buscarCliente(val);
    if (step === STEPS.PEDIR_DIRECCION) await enviarPedido('domicilio', val);
  }

  async function buscarCliente(tel) {
    setLoading(true);
    try {
      let cli;
      try {
        const { data } = await clientesApi.buscar(tel);
        cli = data;
        const { data: rec } = await recomendacionesApi.obtener(tel);
        setRecomendaciones(rec.recomendaciones || []);
        addBot(`¡Hola ${cli.nombre}! 😊 Aquí están tus favoritos y nuestro menú:`);
      } catch {
        const { data: newCli } = await clientesApi.crear({ telefono: tel, nombre: 'Cliente' });
        cli = newCli;
        const { data: rec } = await recomendacionesApi.obtener(tel);
        setRecomendaciones(rec.recomendaciones || []);
        addBot('¡Bienvenido! 🎉 Es tu primera vez con nosotros.\nAquí están nuestros frappes más populares:');
      }
      setCliente(cli);
      const { data: prods } = await productosApi.listar();
      setProductos(prods);
      setStep(STEPS.MOSTRAR_MENU);
    } catch {
      addBot('❌ Error conectando con el servidor. Intenta de nuevo.');
    }
    setLoading(false);
  }

  function agregar(prod) {
    setCarrito(c => {
      const ex = c.find(i => i.id === prod.id);
      return ex ? c.map(i => i.id===prod.id ? {...i, cantidad:i.cantidad+1} : i)
                : [...c, {...prod, cantidad:1}];
    });
  }

  function quitar(id) {
    setCarrito(c => {
      const ex = c.find(i => i.id===id);
      if (!ex) return c;
      return ex.cantidad===1 ? c.filter(i=>i.id!==id) : c.map(i=>i.id===id?{...i,cantidad:i.cantidad-1}:i);
    });
  }

  const total = carrito.reduce((s,i) => s + i.precio*i.cantidad, 0);

  function confirmarPedido() {
    if (!carrito.length) { addBot('Tu carrito está vacío. ¡Elige algo! 🛒'); return; }
    setCarritoFinal([...carrito]);
    addBot('¿Cómo prefieres recibir tu pedido?');
    setStep(STEPS.TIPO_ENTREGA);
  }

  function seleccionarEntrega(tipo) {
    setTipoEntregaFinal(tipo);
    const cf = carrito.length ? carrito : carritoFinal;
    const resumen = cf.map(i => `  · ${i.cantidad}× ${i.nombre}  $${(i.precio*i.cantidad).toLocaleString()}`).join('\n');
    const totalFinal = cf.reduce((s,i) => s + i.precio*i.cantidad, 0);
    const { prepMin, entregaMin, total: totalMin } = calcularTiempo(cf, tipo);

    addBot(
      `🛒 Resumen de tu pedido:\n${resumen}\n💰 Total: $${totalFinal.toLocaleString()}\n\n` +
      (tipo === 'domicilio'
        ? `⏱️ Tiempo estimado:\n  · Preparación: ~${prepMin} min\n  · Entrega: ~${entregaMin} min\n  · Total: ~${totalMin} min\n\n`
        : `⏱️ Tiempo estimado de preparación: ~${prepMin} min\n\n`) +
      `💳 ¿Cómo vas a pagar?`
    );
    setStep(STEPS.PEDIR_PAGO);
  }

  function seleccionarPago(metodo) {
    setMetodoPago(metodo);
    const label = METODOS_PAGO.find(m => m.id === metodo)?.label || metodo;
    addUser(label);
    if (tipoEntregaFinal === 'domicilio') {
      addBot('📍 ¿Cuál es tu dirección de entrega?\n(Ej: Calle 15 #8-32, Barrio El Prado)');
      setStep(STEPS.PEDIR_DIRECCION);
    } else {
      enviarPedido('punto', '');
    }
  }

  async function enviarPedido(tipo, dir) {
    setLoading(true);
    const cf = carritoFinal.length ? carritoFinal : carrito;
    const pagoLabel = METODOS_PAGO.find(m => m.id === metodoPago)?.label || metodoPago;
    try {
      const { data } = await pedidosApi.crear({
        cliente_id:        cliente?.id,
        sede_id:           sedeId,
        canal:             'chatbot',
        tipo_entrega:      tipo,
        direccion_entrega: tipo === 'domicilio' ? dir : null,
        productos:         cf.map(i => ({ producto_id: i.id, cantidad: i.cantidad })),
        metodo_pago:       metodoPago || 'efectivo',
      });
      if (tipo === 'domicilio') {
        addBot(
          `✅ ¡Pedido #${String(data.id).padStart(3,'0')} confirmado!\n` +
          `📍 Dirección: ${dir}\n` +
          `💳 Pago: ${pagoLabel}\n` +
          `🛵 Te avisamos cuando salga el domicilio.`
        );
      } else {
        addBot(
          `✅ ¡Pedido #${String(data.id).padStart(3,'0')} confirmado! 🥤\n` +
          `💳 Pago: ${pagoLabel}\n` +
          `⏳ Pasa a recogerlo cuando esté listo.`
        );
      }
      setCarrito([]);
      setCarritoFinal([]);
      setStep(STEPS.PEDIDO_OK);
    } catch {
      addBot('❌ Error al crear el pedido. Intenta de nuevo.');
    }
    setLoading(false);
  }

  const showMenu  = step === STEPS.MOSTRAR_MENU;
  const showTipo  = step === STEPS.TIPO_ENTREGA;
  const showPago  = step === STEPS.PEDIR_PAGO;
  const showInput = step === STEPS.PEDIR_TELEFONO || step === STEPS.PEDIR_DIRECCION;

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-avatar">M</div>
        <div>
          <div className="chatbot-title">Maracumango</div>
          <div className="chatbot-subtitle">🟢 En línea · Pedidos 24h</div>
        </div>
      </div>

      <div className="chatbot-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.from}`}>
            {m.from === 'bot' && <div className="msg-avatar">🥤</div>}
            <div className={`msg-bubble ${m.from}`}>
              {m.text.split('\n').map((l, j) => (
                <p key={j}>{l.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
              ))}
            </div>
          </div>
        ))}

        {/* Menú */}
        {showMenu && (
          <div className="menu-section">
            {recomendaciones.length > 0 && (
              <>
                <div className="menu-label">⭐ Tus favoritos</div>
                <div className="product-grid">
                  {recomendaciones.map(p => (
                    <ProductCard key={p.id} prod={p}
                      qty={carrito.find(i=>i.id===p.id)?.cantidad||0}
                      onAdd={()=>agregar(p)} onRemove={()=>quitar(p.id)} />
                  ))}
                </div>
              </>
            )}
            <div className="menu-label">🍹 Menú completo</div>
            <div className="product-grid">
              {productos.map(p => (
                <ProductCard key={p.id} prod={p}
                  qty={carrito.find(i=>i.id===p.id)?.cantidad||0}
                  onAdd={()=>agregar(p)} onRemove={()=>quitar(p.id)} />
              ))}
            </div>
            {carrito.length > 0 && (
              <button className="btn-confirmar" onClick={confirmarPedido}>
                🛒 Confirmar pedido · ${total.toLocaleString()}
              </button>
            )}
          </div>
        )}

        {/* Tipo entrega */}
        {showTipo && (
          <div className="entrega-options">
            <button className="btn-entrega" onClick={()=>seleccionarEntrega('punto')}>
              🏃 Recoger en el punto
            </button>
            <button className="btn-entrega secondary" onClick={()=>seleccionarEntrega('domicilio')}>
              🛵 Domicilio
            </button>
          </div>
        )}

        {/* Método de pago */}
        {showPago && (
          <div className="entrega-options">
            {METODOS_PAGO.map(m => (
              <button key={m.id} className="btn-entrega" onClick={()=>seleccionarPago(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        )}

        {step === STEPS.PEDIDO_OK && (
          <button className="btn-nuevo" onClick={()=>window.location.reload()}>
            🔄 Hacer otro pedido
          </button>
        )}

        {loading && <div className="typing"><span/><span/><span/></div>}
        <div ref={endRef} />
      </div>

      {showInput && (
        <div className="chatbot-input">
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleSend()}
            placeholder={step===STEPS.PEDIR_DIRECCION ? 'Escribe tu dirección completa...' : 'Tu número de celular...'}
            type={step===STEPS.PEDIR_TELEFONO ? 'tel' : 'text'}
            autoFocus
          />
          <button onClick={()=>handleSend()} disabled={loading}>→</button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ prod, qty, onAdd, onRemove }) {
  return (
    <div className="product-card">
      <div className="product-icon">🥤</div>
      <div className="product-info">
        <div className="product-name">{prod.nombre}</div>
        <div className="product-price">${Number(prod.precio).toLocaleString()}</div>
      </div>
      <div className="product-controls">
        {qty > 0 && <button className="btn-qty minus" onClick={onRemove}>-</button>}
        {qty > 0 && <span className="qty-badge">{qty}</span>}
        <button className="btn-qty plus" onClick={onAdd}>+</button>
      </div>
    </div>
  );
}