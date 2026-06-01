require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE','OPTIONS'] }));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/clientes',        require('./routes/clientes'));
app.use('/api/productos',       require('./routes/productos'));
app.use('/api/recomendaciones', require('./routes/recomendaciones'));
app.use('/api/pedidos',         require('./routes/pedidos'));
app.use('/api/ventas',          require('./routes/ventas'));
app.use('/api/inventario',      require('./routes/inventario'));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Maracumango API', version: '1.0.0', timestamp: new Date() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: true, message: `Ruta ${req.path} no encontrada` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('🥤 ════════════════════════════════════════');
  console.log('   MARACUMANGO API  –  v1.0.0');
  console.log(`   http://localhost:${PORT}`);
  console.log('   /api/health  para verificar estado');
  console.log('🥤 ════════════════════════════════════════');
  console.log('');
});
