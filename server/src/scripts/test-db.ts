import { connectPostgres } from '../config/postgres.js';

const testConnection = async () => {
  console.log('Testing PostgreSQL connection...');
  await connectPostgres();
  console.log('Test complete.');
  process.exit(0);
};

testConnection();
