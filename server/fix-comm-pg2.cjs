require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const studentId = '1c68b113-173f-492d-8c50-8b578015728a';
  const enrollmentId = '24bd79e0-24fe-4f3f-a9a2-428797427ad5';

  // We know Semester 2 is 0.7 and Semester 3 is 0.65.
  // The original expectedAmount was 0.65 (for Semester 1).
  // Total should be 0.65 + 0.7 + 0.65 = 2.0

  await client.query(`
    UPDATE "CommissionIn" SET "expectedAmount" = 2.0, "status" = 'pending' WHERE "enrollmentId" = $1
  `, [enrollmentId]);
  
  console.log("Updated expectedAmount to 2.0");

  await client.end();
}

main().catch(console.error);
