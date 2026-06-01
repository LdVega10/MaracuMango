const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// GET /api/ventas?sede=all&fecha=2025-05-31
router.get('/', async (req, res) => {
  try {
    const { sede = 'all', fecha } = req.query;
    const hoy = fecha || new Date().toISOString().split('T')[0];

    let sedeFilter = '';
    const params = [hoy];
    if (sede !== 'all') { sedeFilter = ' AND p.sede_id = $2'; params.push(sede); }

    // Total ventas
    const { rows: [totales] } = await pool.query(`
      SELECT
        COUNT(*)::int            AS total_pedidos,
        COALESCE(SUM(total),0)   AS total_ventas,
        COUNT(CASE WHEN canal='chatbot'    THEN 1 END)::int AS pedidos_web,
        COUNT(CASE WHEN canal='presencial' THEN 1 END)::int AS pedidos_presencial
      FROM pedidos p
      WHERE DATE(p.created_at) = $1
        AND p.estado != 'cancelado'
        ${sedeFilter}
    `, params);

    // Ventas por sede
    const { rows: porSede } = await pool.query(`
      SELECT s.nombre AS sede, COALESCE(SUM(p.total),0) AS ventas, COUNT(*)::int AS pedidos
      FROM sedes s
      LEFT JOIN pedidos p ON p.sede_id = s.id
        AND DATE(p.created_at) = $1
        AND p.estado != 'cancelado'
      GROUP BY s.id, s.nombre
      ORDER BY ventas DESC
    `, [hoy]);

    // Productos más vendidos
    const { rows: topProductos } = await pool.query(`
      SELECT pr.nombre, SUM(dp.cantidad)::int AS unidades, SUM(dp.cantidad * dp.precio_unitario) AS ingresos
      FROM detalle_pedido dp
      JOIN pedidos p ON p.id = dp.pedido_id
      JOIN productos pr ON pr.id = dp.producto_id
      WHERE DATE(p.created_at) = $1 AND p.estado != 'cancelado'
      GROUP BY pr.id, pr.nombre
      ORDER BY unidades DESC
      LIMIT 5
    `, [hoy]);

    res.json({ fecha: hoy, ...totales, por_sede: porSede, top_productos: topProductos });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
