const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// GET /api/recomendaciones/:telefono
router.get('/:telefono', async (req, res) => {
  try {
    const clienteRes = await pool.query(
      'SELECT id FROM clientes WHERE telefono=$1', [req.params.telefono]
    );

    // Regla 3: cliente nuevo → productos más populares
    if (!clienteRes.rows.length) {
      const { rows } = await pool.query(`
        SELECT p.*, COALESCE(SUM(pc.veces_pedido),0) AS popularidad
        FROM productos p
        LEFT JOIN preferencias_cliente pc ON p.id = pc.producto_id
        WHERE p.disponible = true
        GROUP BY p.id
        ORDER BY popularidad DESC
        LIMIT 3
      `);
      return res.json({ tipo: 'popular', recomendaciones: rows });
    }

    const clienteId = clienteRes.rows[0].id;

    // Regla 1: historial propio
    const { rows: propios } = await pool.query(`
      SELECT p.*, pc.veces_pedido
      FROM preferencias_cliente pc
      JOIN productos p ON p.id = pc.producto_id
      WHERE pc.cliente_id = $1 AND p.disponible = true
      ORDER BY pc.veces_pedido DESC
      LIMIT 3
    `, [clienteId]);

    if (propios.length) {
      // Regla 2: similares por categoría del más pedido
      const categoria = propios[0].categoria;
      const ids = propios.map(p => p.id);
      const { rows: similares } = await pool.query(`
        SELECT * FROM productos
        WHERE categoria=$1 AND id != ALL($2::int[]) AND disponible=true
        ORDER BY nombre LIMIT 2
      `, [categoria, ids]);

      return res.json({ tipo: 'historial', recomendaciones: propios, similares });
    }

    // Sin historial aún
    const { rows: populares } = await pool.query(`
      SELECT p.*, COALESCE(SUM(pc.veces_pedido),0) AS popularidad
      FROM productos p
      LEFT JOIN preferencias_cliente pc ON p.id = pc.producto_id
      WHERE p.disponible = true
      GROUP BY p.id ORDER BY popularidad DESC LIMIT 3
    `);
    res.json({ tipo: 'popular', recomendaciones: populares });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
