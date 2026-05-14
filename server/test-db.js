import pg from 'pg';

async function test() {
  const client = new pg.Client({
    connectionString: "postgresql://retro@localhost:5436/postgres?sslmode=disable"
  });
  
  try {
    await client.connect();
    console.log('Successfully connected to Postgres server on port 5436');
    const res = await client.query('SELECT datname FROM pg_database');
    console.log('Available databases:');
    res.rows.forEach(row => console.log(` - ${row.datname}`));
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

test();
