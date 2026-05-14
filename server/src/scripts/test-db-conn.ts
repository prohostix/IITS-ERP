import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ Directly connected with pg pool');
    const res = await client.query('SELECT NOW()');
    console.log('✅ Query result:', res.rows[0]);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  }
}

test();
