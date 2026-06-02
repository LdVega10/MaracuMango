const pool = require('./connection');

async function fix() {
  const client = await pool.connect();
  try {
    console.log('🔧 Actualizando roles en BD...');
    // Drop existing constraint and recreate with domiciliario
    await client.query(`
      ALTER TABLE usuarios 
      DROP CONSTRAINT IF EXISTS usuarios_rol_check;
      
      ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_rol_check 
      CHECK (rol IN ('admin','mesera','cocinero','cajera','domiciliario'));
    `);
    console.log('✅ Roles actualizados');
  } catch(err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
fix();