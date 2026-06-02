const express  = require('express');
const router   = express.Router();
const pool     = require('../db/connection');
const bcrypt   = require('bcryptjs');
const auth     = require('../middleware/auth');

// GET /api/usuarios — solo admin
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, email, rol, sede_id, activo, created_at FROM usuarios ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch(err) { res.status(500).json({ error:true, message:err.message }); }
});

// POST /api/usuarios — solo admin crea usuarios
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { nombre, email, password, rol, sede_id } = req.body;
    if (!nombre || !email || !password || !rol)
      return res.status(400).json({ error:true, message:'Todos los campos son requeridos' });

    const roles = ['admin','mesera','cocinero','cajera','domiciliario'];
    if (!roles.includes(rol))
      return res.status(400).json({ error:true, message:'Rol inválido' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, sede_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, nombre, email, rol, sede_id',
      [nombre, email, hash, rol, sede_id || 1]
    );
    res.status(201).json(rows[0]);
  } catch(err) {
    if (err.code === '23505')
      return res.status(400).json({ error:true, message:'Ya existe un usuario con ese correo' });
    res.status(500).json({ error:true, message:err.message });
  }
});

// DELETE /api/usuarios/:id — solo admin
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    await pool.query('UPDATE usuarios SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ ok:true });
  } catch(err) { res.status(500).json({ error:true, message:err.message }); }
});

module.exports = router;