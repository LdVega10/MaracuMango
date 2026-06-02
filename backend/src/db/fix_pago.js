const pool = require('./connection');

async function fix() {
  const client = await pool.connect();
  try {
    console.log('🔧 Agregando columna metodo_pago...');
    await client.query(`
      ALTER TABLE pedidos 
      ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30) DEFAULT 'transferencia';
    `);
    console.log('✅ Columna metodo_pago agregada');
  } catch(err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
fix();