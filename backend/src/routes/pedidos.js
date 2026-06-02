const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// Consumo estándar por frappe 16oz basado en recetas estándar
// fruta: 0.15kg, hielo: 0.2kg, leche: 0.1L, vaso: 1 unidad
const CONSUMO_BASE = [
  { insumo: 'Hielo',      cantidad: 0.2,  unidad: 'kg'       },
  { insumo: 'Leche',      cantidad: 0.1,  unidad: 'litros'   },
  { insumo: 'Vasos 16oz', cantidad: 1,    unidad: 'unidades' },
];

// Mapa sabor → insumo de fruta
const FRUTA_POR_PRODUCTO = {
  'Frappe Maracuyá':  { insumo: 'Maracuyá', cantidad: 0.15 },
  'Frappe Mango':     { insumo: 'Mango',    cantidad: 0.15 },
  'Frappe Fresa':     { insumo: 'Fresa',    cantidad: 0.15 },
  'Frappe Lulo':      { insumo: 'Lulo',     cantidad: 0.15 },
  'Frappe Guanábana': { insumo: 'Guanábana',cantidad: 0.15 },
};

async function descontarInventario(client, sede_id, nombreProducto, cantidad) {
  // Descontar fruta específica
  const fruta = FRUTA_POR_PRODUCTO[nombreProducto];
  if (fruta) {
    await client.query(`
      UPDATE inventario
      SET cantidad = GREATEST(0, cantidad - $1), fecha_actualizacion = NOW()
      WHERE sede_id = $2 AND insumo = $3
    `, [fruta.cantidad * cantidad, sede_id, fruta.insumo]);
  }
  // Descontar base (hielo, leche, vasos)
  for (const c of CONSUMO_BASE) {
    await client.query(`
      UPDATE inventario
      SET cantidad = GREATEST(0, cantidad - $1), fecha_actualizacion = NOW()
      WHERE sede_id = $2 AND insumo = $3
    `, [c.cantidad * cantidad, sede_id, c.insumo]);
  }
}

// POST /api/pedidos
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { cliente_id, sede_id = 1, canal = 'chatbot',
            productos, tipo_entrega = 'punto', direccion_entrega, usuario_id, metodo_pago } = req.body;

    if (!productos?.length)
      return res.status(400).json({ error: true, message: 'Productos requeridos' });

    // Calcular total y obtener nombres de productos
    let total = 0;
    const productosConInfo = [];
    for (const item of productos) {
      const { rows } = await client.query('SELECT id, nombre, precio FROM productos WHERE id=$1', [item.producto_id]);
      if (!rows.length) throw new Error(`Producto ${item.producto_id} no existe`);
      total += rows[0].precio * item.cantidad;
      productosConInfo.push({ ...item, nombre: rows[0].nombre, precio: rows[0].precio });
    }

    // Crear pedido
    const { rows: [pedido] } = await client.query(`
      INSERT INTO pedidos (cliente_id, sede_id, usuario_id, canal, total, tipo_entrega, direccion_entrega, metodo_pago)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [cliente_id||null, sede_id, usuario_id||null, canal, total, tipo_entrega, direccion_entrega||null, metodo_pago||'transferencia']);

    // Insertar detalles + descontar inventario + actualizar preferencias
    for (const item of productosConInfo) {
      await client.query(`
        INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
        VALUES ($1,$2,$3,$4)
      `, [pedido.id, item.producto_id, item.cantidad, item.precio]);

      // Descontar insumos del inventario
      await descontarInventario(client, sede_id, item.nombre, item.cantidad);

      // Actualizar preferencias del cliente
      if (cliente_id) {
        await client.query(`
          INSERT INTO preferencias_cliente (cliente_id, producto_id, veces_pedido)
          VALUES ($1,$2,$3)
          ON CONFLICT (cliente_id, producto_id)
          DO UPDATE SET veces_pedido = preferencias_cliente.veces_pedido + $3
        `, [cliente_id, item.producto_id, item.cantidad]);
      }
    }

    await client.query('COMMIT');

    const { rows: detalles } = await pool.query(`
      SELECT dp.*, p.nombre FROM detalle_pedido dp
      JOIN productos p ON p.id = dp.producto_id
      WHERE dp.pedido_id = $1
    `, [pedido.id]);

    res.status(201).json({ ...pedido, detalles });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: true, message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/pedidos/pendientes?sede_id=1
router.get('/pendientes', async (req, res) => {
  try {
    const { sede_id = 1 } = req.query;
    const { rows } = await pool.query(`
      SELECT p.*, c.nombre AS cliente_nombre, c.telefono,
             json_agg(json_build_object(
               'producto', pr.nombre,
               'cantidad', dp.cantidad,
               'precio',   dp.precio_unitario
             )) AS items
      FROM pedidos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      JOIN detalle_pedido dp ON dp.pedido_id = p.id
      JOIN productos pr ON pr.id = dp.producto_id
      WHERE p.sede_id = $1
        AND p.estado IN ('pendiente','en_preparacion','listo')
      GROUP BY p.id, c.nombre, c.telefono
      ORDER BY p.created_at ASC
    `, [sede_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// GET /api/pedidos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, c.nombre AS cliente_nombre,
             json_agg(json_build_object(
               'producto', pr.nombre,
               'cantidad', dp.cantidad,
               'precio',   dp.precio_unitario
             )) AS items
      FROM pedidos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      JOIN detalle_pedido dp ON dp.pedido_id = p.id
      JOIN productos pr ON pr.id = dp.producto_id
      WHERE p.id = $1
      GROUP BY p.id, c.nombre
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: true, message: 'Pedido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// PATCH /api/pedidos/:id/estado
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ['pendiente','en_preparacion','listo','entregado','cancelado'];
    if (!estados.includes(estado))
      return res.status(400).json({ error: true, message: 'Estado inválido' });
    const { rows } = await pool.query(
      'UPDATE pedidos SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [estado, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: true, message: 'Pedido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;