require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  // 1. Get all paid Invoices that don't have a matching StudentFeeReceipt
  const { rows: paidInvoices } = await client.query(`
    SELECT i.id, i.amount, i."total", i."invoiceNo", i."organizationId", i."studentId", i."updatedAt"
    FROM "Invoice" i
    WHERE i.status = 'paid' AND i.items::text LIKE '%Semester%'
  `);
  
  let created = 0;
  for (const inv of paidInvoices) {
    if (!inv.studentId) continue;
    
    // Get enrollment for this student
    const { rows: enrollments } = await client.query(`
      SELECT id FROM "Enrollment" WHERE "studentId" = $1 LIMIT 1
    `, [inv.studentId]);
    
    if (enrollments.length === 0) continue;
    const enrollmentId = enrollments[0].id;
    
    // Check if receipt exists
    const { rows: receipts } = await client.query(`
      SELECT id FROM "StudentFeeReceipt" WHERE "enrollmentId" = $1 AND "amount" = $2
    `, [enrollmentId, inv.total]);
    
    if (receipts.length === 0) {
      // Find ANY user in this org
      const { rows: users } = await client.query(`
        SELECT id FROM "User" WHERE "organizationId" = $1 LIMIT 1
      `, [inv.organizationId]);
      
      const userId = users.length > 0 ? users[0].id : null;
      if (!userId) {
        console.log('No user found for org ' + inv.organizationId);
        continue;
      }
      
      const { v4: uuidv4 } = require('uuid');
      
      await client.query(`
        INSERT INTO "StudentFeeReceipt" 
        (id, "organizationId", "enrollmentId", "amount", "paymentMode", "remarks", "recordedBy", "receiptDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        uuidv4(),
        inv.organizationId,
        enrollmentId,
        inv.total,
        'Wallet', 
        'Auto-backfilled from Invoice: ' + inv.invoiceNo,
        userId,
        inv.updatedAt
      ]);
      console.log(`Backfilled receipt for Invoice ${inv.invoiceNo} amount ${inv.total}`);
      created++;
    }
  }
  
  console.log(`Created ${created} missing receipts.`);
  await client.end();
}

main().catch(console.error);
