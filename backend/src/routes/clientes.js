const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// GET /api/clientes/:telefono
router.get('/:telefono', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clientes WHERE telefono=$1', [req.params.telefono]
    );
    if (!rows.length) return res.status(404).json({ error: true, message: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono } = req.body;
    if (!telefono) return res.status(400).json({ error: true, message: 'Teléfono requerido' });
    const { rows } = await pool.query(
      'INSERT INTO clientes (nombre, telefono) VALUES ($1,$2) ON CONFLICT (telefono) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING *',
      [nombre || 'Cliente', telefono]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
