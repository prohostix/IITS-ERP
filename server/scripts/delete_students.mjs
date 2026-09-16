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

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter: adapter,
  log: ['error', 'warn'],
});

async function main() {
  console.log('⚠️ STARTING BULK DELETION OF STUDENT DATA ⚠️');

  try {
    const commOut = await prisma.commissionOut.deleteMany({});
    console.log(`Deleted ${commOut.count} CommissionOut records.`);

    const commIn = await prisma.commissionIn.deleteMany({});
    console.log(`Deleted ${commIn.count} CommissionIn records.`);

    const marks = await prisma.internalMark.deleteMany({});
    console.log(`Deleted ${marks.count} InternalMark records.`);

    const uniFee = await prisma.universityFeePayment.deleteMany({});
    console.log(`Deleted ${uniFee.count} UniversityFeePayment records.`);

    const statusReq = await prisma.studentStatusRequest.deleteMany({});
    console.log(`Deleted ${statusReq.count} StudentStatusRequest records.`);

    const paymentEntry = await prisma.paymentEntry.deleteMany({});
    console.log(`Deleted ${paymentEntry.count} PaymentEntry records.`);

    const invoice = await prisma.invoice.deleteMany({
      where: { studentId: { not: null } }
    });
    console.log(`Deleted ${invoice.count} Invoice records linked to students.`);

    const enrPay = await prisma.enrollmentPayment.deleteMany({});
    console.log(`Deleted ${enrPay.count} EnrollmentPayment records.`);

    const enrollments = await prisma.enrollment.deleteMany({});
    console.log(`Deleted ${enrollments.count} Enrollment records.`);

    const students = await prisma.student.deleteMany({});
    console.log(`Deleted ${students.count} Student records.`);

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
