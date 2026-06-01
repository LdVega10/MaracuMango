const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/connection');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: true, message: 'Email y contraseña requeridos' });

    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email=$1 AND activo=true', [email]
    );
    if (!rows.length)
      return res.status(401).json({ error: true, message: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: true, message: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, rol: user.rol, sede_id: user.sede_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, nombre: user.nombre, rol: user.rol, sede_id: user.sede_id });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
