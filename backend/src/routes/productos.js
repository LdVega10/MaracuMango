const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// GET /api/productos
router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    let q = 'SELECT * FROM productos WHERE disponible=true';
    const params = [];
    if (categoria) { q += ' AND categoria=$1'; params.push(categoria); }
    q += ' ORDER BY categoria, nombre';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM productos WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: true, message: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
