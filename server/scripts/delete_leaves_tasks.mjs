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
  console.log('⚠️ STARTING BULK DELETION OF LEAVES AND TASKS ⚠️');

  try {
    const escLogs = await prisma.escalationLog.deleteMany({});
    console.log(`Deleted ${escLogs.count} EscalationLog records.`);

    const escalations = await prisma.escalation.deleteMany({});
    console.log(`Deleted ${escalations.count} Escalation records.`);

    const tasks = await prisma.task.deleteMany({});
    console.log(`Deleted ${tasks.count} Task records.`);

    const leaveReqs = await prisma.leaveRequest.deleteMany({});
    console.log(`Deleted ${leaveReqs.count} LeaveRequest records.`);

    const leaveAllocs = await prisma.leaveAllocation.deleteMany({});
    console.log(`Deleted ${leaveAllocs.count} LeaveAllocation records.`);

    console.log('✅ ALL LEAVES AND TASKS DELETED SUCCESSFULLY.');
  } catch (err) {
    console.error('❌ Error during deletion:', err);
  } finally {
    process.exit(0);
  }
}

main();
