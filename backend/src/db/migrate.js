const pool = require('./connection');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Iniciando migración...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS sedes (
        id          SERIAL PRIMARY KEY,
        nombre      VARCHAR(100) NOT NULL,
        direccion   VARCHAR(200),
        ciudad      VARCHAR(100) DEFAULT 'Santa Marta',
        activa      BOOLEAN DEFAULT true,
        created_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id           SERIAL PRIMARY KEY,
        nombre       VARCHAR(100) NOT NULL,
        email        VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol          VARCHAR(20) CHECK (rol IN ('admin','mesera','cocinero','cajera')) DEFAULT 'mesera',
        sede_id      INTEGER REFERENCES sedes(id),
        activo       BOOLEAN DEFAULT true,
        created_at   TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS productos (
        id          SERIAL PRIMARY KEY,
        nombre      VARCHAR(150) NOT NULL,
        descripcion TEXT,
        categoria   VARCHAR(80) DEFAULT 'Frappes',
        precio      NUMERIC(10,2) NOT NULL,
        disponible  BOOLEAN DEFAULT true,
        created_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clientes (
        id            SERIAL PRIMARY KEY,
        nombre        VARCHAR(100),
        telefono      VARCHAR(20) UNIQUE NOT NULL,
        fecha_registro TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id          SERIAL PRIMARY KEY,
        cliente_id  INTEGER REFERENCES clientes(id),
        sede_id     INTEGER REFERENCES sedes(id),
        usuario_id  INTEGER REFERENCES usuarios(id),
        canal       VARCHAR(20) CHECK (canal IN ('presencial','chatbot')) DEFAULT 'chatbot',
        estado      VARCHAR(30) CHECK (estado IN ('pendiente','en_preparacion','listo','entregado','cancelado')) DEFAULT 'pendiente',
        total       NUMERIC(10,2) DEFAULT 0,
        direccion_entrega TEXT,
        tipo_entrega VARCHAR(20) CHECK (tipo_entrega IN ('punto','domicilio')) DEFAULT 'punto',
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS detalle_pedido (
        id              SERIAL PRIMARY KEY,
        pedido_id       INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
        producto_id     INTEGER REFERENCES productos(id),
        cantidad        INTEGER NOT NULL DEFAULT 1,
        precio_unitario NUMERIC(10,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS preferencias_cliente (
        cliente_id   INTEGER REFERENCES clientes(id),
        producto_id  INTEGER REFERENCES productos(id),
        veces_pedido INTEGER DEFAULT 1,
        PRIMARY KEY (cliente_id, producto_id)
      );

      CREATE TABLE IF NOT EXISTS inventario (
        id                 SERIAL PRIMARY KEY,
        sede_id            INTEGER REFERENCES sedes(id),
        insumo             VARCHAR(150) NOT NULL,
        cantidad           NUMERIC(10,2) DEFAULT 0,
        unidad             VARCHAR(30) DEFAULT 'unidades',
        fecha_actualizacion TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Tablas creadas exitosamente');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
