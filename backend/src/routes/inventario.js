const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// GET /api/inventario?sede_id=1
router.get('/', async (req, res) => {
  try {
    const { sede_id = 1 } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM inventario WHERE sede_id=$1 ORDER BY insumo',
      [sede_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// POST /api/inventario – REEMPLAZA la cantidad del insumo (o crea si no existe)
router.post('/', async (req, res) => {
  try {
    const { sede_id, insumo, cantidad, unidad = 'unidades' } = req.body;
    if (!sede_id || !insumo)
      return res.status(400).json({ error: true, message: 'sede_id e insumo requeridos' });

    // Upsert: si existe reemplaza cantidad, si no existe crea
    const { rows } = await pool.query(`
      INSERT INTO inventario (sede_id, insumo, cantidad, unidad, fecha_actualizacion)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (sede_id, insumo)
      DO UPDATE SET
        cantidad             = inventario.cantidad + $3,
        unidad               = $4,
        fecha_actualizacion  = NOW()
      RETURNING *
    `, [sede_id, insumo, cantidad || 0, unidad]);

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;