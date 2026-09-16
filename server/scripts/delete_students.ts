import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const useSSL = process.env.DATABASE_URL && 
               !process.env.DATABASE_URL.includes('localhost') && 
               !process.env.DATABASE_URL.includes('127.0.0.1') &&
               !process.env.DATABASE_URL.includes('::1');

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? {
    rejectUnauthorized: false
  } : undefined
});

const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({
  adapter: adapter as any,
  log: ['error', 'warn'],
});

async function main() {
  console.log('⚠️ STARTING BULK DELETION OF STUDENT DATA ⚠️');

  try {
    // 1. CommissionOut (Depends on CommissionIn)
    const commOut = await prisma.commissionOut.deleteMany({});
    console.log(`Deleted ${commOut.count} CommissionOut records.`);

    // 2. CommissionIn (Depends on Enrollment)
    const commIn = await prisma.commissionIn.deleteMany({});
    console.log(`Deleted ${commIn.count} CommissionIn records.`);

    // 3. InternalMark (Depends on Enrollment/Student)
    const marks = await prisma.internalMark.deleteMany({});
    console.log(`Deleted ${marks.count} InternalMark records.`);

    // 4. UniversityFeePayment (Depends on Student)
    const uniFee = await prisma.universityFeePayment.deleteMany({});
    console.log(`Deleted ${uniFee.count} UniversityFeePayment records.`);

    // 5. StudentStatusRequest (Depends on Student)
    const statusReq = await prisma.studentStatusRequest.deleteMany({});
    console.log(`Deleted ${statusReq.count} StudentStatusRequest records.`);

    // 6. PaymentEntry (Depends on Invoice)
    const paymentEntry = await prisma.paymentEntry.deleteMany({});
    console.log(`Deleted ${paymentEntry.count} PaymentEntry records.`);

    // 7. Invoice (Only those linked to a Student)
    const invoice = await prisma.invoice.deleteMany({
      where: { studentId: { not: null } }
    });
    console.log(`Deleted ${invoice.count} Invoice records linked to students.`);

    // 8. EnrollmentPayment (Depends on Enrollment)
    const enrPay = await prisma.enrollmentPayment.deleteMany({});
    console.log(`Deleted ${enrPay.count} EnrollmentPayment records.`);

    // 9. Enrollment (Depends on Student indirectly and directly)
    const enrollments = await prisma.enrollment.deleteMany({});
    console.log(`Deleted ${enrollments.count} Enrollment records.`);

    // 10. Student (The core records)
    const students = await prisma.student.deleteMany({});
    console.log(`Deleted ${students.count} Student records.`);

    // 11. User (Where role is 'student')
    const users = await prisma.user.deleteMany({
      where: { role: 'student' }
    });
    console.log(`Deleted ${users.count} User records (role: student).`);

    console.log('✅ ALL STUDENT DATA DELETED SUCCESSFULLY.');
  } catch (err) {
    console.error('❌ Error during deletion:', err);
  } finally {
    process.exit(0);
  }
}

main();
