const pool = require('./connection');

async function fix() {
  const client = await pool.connect();
  try {
    console.log('🔧 Corrigiendo tabla inventario...');

    // 1. Eliminar duplicados (conservar el de mayor cantidad por sede+insumo)
    await client.query(`
      DELETE FROM inventario a
      USING inventario b
      WHERE a.id < b.id
        AND a.sede_id = b.sede_id
        AND a.insumo  = b.insumo;
    `);

    // 2. Agregar restricción única si no existe
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'inventario_sede_insumo_unique'
        ) THEN
          ALTER TABLE inventario
          ADD CONSTRAINT inventario_sede_insumo_unique UNIQUE (sede_id, insumo);
        END IF;
      END$$;
    `);

    console.log('✅ Duplicados eliminados y restricción única agregada');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();