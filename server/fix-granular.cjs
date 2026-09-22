require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const enrollmentId = '24bd79e0-24fe-4f3f-a9a2-428797427ad5'; // Pro Hostixgf enrollment

  // Fetch existing commission
  const { rows: existing } = await client.query(`
    SELECT * FROM "CommissionIn" WHERE "enrollmentId" = $1 LIMIT 1
  `, [enrollmentId]);

  if (existing.length > 0) {
    const orig = existing[0];
    
    // 1. Update the original back to Semester 1
    await client.query(`
      UPDATE "CommissionIn" 
      SET "expectedAmount" = 0.65, "title" = 'Semester 1', "status" = 'received' 
      WHERE id = $1
    `, [orig.id]);
    console.log("Updated original commission to Semester 1");

    // 2. Insert Semester 2
    await client.query(`
      INSERT INTO "CommissionIn" ("id", "organizationId", "enrollmentId", "expectedAmount", "receivedAmount", "status", "title", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 0.70, 0, 'pending', 'Semester 2', NOW(), NOW())
    `, [orig.organizationId, enrollmentId]);
    console.log("Inserted Semester 2 commission");

    // 3. Insert Semester 3
    await client.query(`
      INSERT INTO "CommissionIn" ("id", "organizationId", "enrollmentId", "expectedAmount", "receivedAmount", "status", "title", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 0.65, 0, 'pending', 'Semester 3', NOW(), NOW())
    `, [orig.organizationId, enrollmentId]);
    console.log("Inserted Semester 3 commission");
  }

  // Update ALL other commissions to have a default title if null
  await client.query(`
    UPDATE "CommissionIn" SET "title" = 'Initial Enrollment' WHERE "title" IS NULL
  `);
  console.log("Updated null titles");

  await client.end();
}

main().catch(console.error);
