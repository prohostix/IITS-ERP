require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // Find the student Pro Hostixgf
  const { rows: students } = await client.query(`
    SELECT id, "name" FROM "Student" WHERE "name" LIKE '%Pro Hostixgf%' LIMIT 1
  `);

  if (students.length === 0) {
    console.log("Student not found");
    process.exit(1);
  }

  const studentId = students[0].id;
  console.log("Found student:", studentId);

  // Find enrollment
  const { rows: enrollments } = await client.query(`
    SELECT id, "sessionId", "specialisation", "programId" FROM "Enrollment" WHERE "studentId" = $1 LIMIT 1
  `, [studentId]);

  if (enrollments.length === 0) {
    console.log("Enrollment not found");
    process.exit(1);
  }

  const enrollment = enrollments[0];
  console.log("Found enrollment:", enrollment.id);

  // Find all paid installments for this student
  const { rows: paidInvoices } = await client.query(`
    SELECT id, "amount", "total", "invoiceNo", "updatedAt", "items"
    FROM "Invoice"
    WHERE "studentId" = $1 AND "status" = 'paid' AND items::text LIKE '%Semester%'
  `, [studentId]);

  console.log("Paid invoices for student:", paidInvoices.length);

  // Get Program Fee Structure
  const { rows: pfs } = await client.query(`
    SELECT * FROM "ProgramFeeStructure" WHERE "programId" = $1
  `, [enrollment.programId]);

  let feeStructure = null;
  for (const f of pfs) {
    if (f.admissionSessionId === enrollment.sessionId && f.specialisation === enrollment.specialisation) {
      feeStructure = f; break;
    }
  }
  if (!feeStructure) {
    feeStructure = pfs[0];
  }

  if (!feeStructure || !feeStructure.feeBreakdown) {
    console.log("No fee structure found");
    process.exit(1);
  }

  const breakdown = feeStructure.feeBreakdown;
  let totalCommToAdd = 0;

  for (const inv of paidInvoices) {
    const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
    if (items && items.length > 0) {
      const desc = items[0].description || '';
      const match = desc.match(/Semester (\d+)/i) || desc.match(/Year (\d+)/i) || desc.match(/Installment (\d+)/i);
      
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        // Wait! The first semester is usually paid at enrollment (which is already recorded).
        // Is the first semester included in invoices? Let's see.
        console.log(`Invoice ${inv.invoiceNo} is for Semester ${match[1]}`);
        
        if (idx >= 0 && idx < breakdown.length) {
          const b = breakdown[idx];
          const bCommRate = Number(b.commissionRate || feeStructure.commissionRate || 0);
          const bUni = Number(b.universityFee || 0);
          
          if (bCommRate > 0) {
            const comm = (bUni * bCommRate) / 100;
            console.log(`Expected commission for Sem ${idx+1} is ${comm}`);
            // Wait, we need to sum ONLY the ones that weren't included in the initial CommissionIn.
            // But if we just sum ALL paid semesters, we get the total expected commission!
            totalCommToAdd += comm;
          }
        }
      }
    }
  }

  console.log("Total expected commission should be:", totalCommToAdd);

  // Update CommissionIn
  if (totalCommToAdd > 0) {
    const { rows: commIn } = await client.query(`
      SELECT id, "expectedAmount" FROM "CommissionIn" WHERE "enrollmentId" = $1 LIMIT 1
    `, [enrollment.id]);

    if (commIn.length > 0) {
      console.log(`Current expectedAmount: ${commIn[0].expectedAmount}, updating to ${totalCommToAdd}`);
      await client.query(`
        UPDATE "CommissionIn" SET "expectedAmount" = $1, "status" = 'pending' WHERE id = $2
      `, [totalCommToAdd, commIn[0].id]);
      console.log("Updated CommissionIn");
    } else {
      console.log("No CommissionIn record found");
    }
  }

  await client.end();
}

main().catch(console.error);
