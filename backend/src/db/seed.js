const pool = require('./connection');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Insertando datos iniciales...');

    // Sedes
    await client.query(`
      INSERT INTO sedes (nombre, direccion) VALUES
        ('Buenavista', 'Frente al C.C. Buenavista, Santa Marta'),
        ('Centro',     'Centro Histórico, Santa Marta'),
        ('Rodadero',   'El Rodadero, Santa Marta'),
        ('Pescado',    'Barrio El Pescado, Santa Marta')
      ON CONFLICT DO NOTHING;
    `);

    // Admin user
    const hash = await bcrypt.hash('maracumango2025', 10);
    await client.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, sede_id) VALUES
        ('Administradora', 'admin@maracumango.com', $1, 'admin',   1),
        ('Mesera Sede 1',  'mesera1@maracumango.com', $1, 'mesera', 1),
        ('Cocinero Sede 1','cocina1@maracumango.com', $1, 'cocinero', 1)
      ON CONFLICT (email) DO NOTHING;
    `, [hash]);

    // Productos
    await client.query(`
      INSERT INTO productos (nombre, descripcion, categoria, precio) VALUES
        ('Frappe Maracuyá',  'Frappe de maracuyá natural 16 oz',     'Frappes', 8000),
        ('Frappe Mango',     'Frappe de mango maduro 16 oz',         'Frappes', 8000),
        ('Frappe Fresa',     'Frappe de fresa natural 16 oz',        'Frappes', 7500),
        ('Frappe Lulo',      'Frappe de lulo costeño 16 oz',         'Frappes', 7500),
        ('Frappe Guanábana', 'Frappe de guanábana cremosa 16 oz',    'Frappes', 8500),
        ('Bebida Natural',   'Jugo de fruta natural 16 oz',          'Bebidas', 6000),
        ('Granizado',        'Granizado de frutas tropicales',        'Bebidas', 5000),
        ('Combo 2x1',        '2 Frappes del mismo sabor',            'Combos',  14000)
      ON CONFLICT DO NOTHING;
    `);

    // Inventario inicial
    await client.query(`
      INSERT INTO inventario (sede_id, insumo, cantidad, unidad) VALUES
        (1,'Maracuyá',  50, 'kg'),
        (1,'Mango',     40, 'kg'),
        (1,'Fresa',     20, 'kg'),
        (1,'Leche',    100, 'litros'),
        (1,'Hielo',    200, 'kg'),
        (1,'Vasos 16oz',300,'unidades')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Datos iniciales insertados');
    console.log('');
    console.log('👤 Credenciales de acceso:');
    console.log('   Admin:   admin@maracumango.com  / maracumango2025');
    console.log('   Mesera:  mesera1@maracumango.com / maracumango2025');
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
