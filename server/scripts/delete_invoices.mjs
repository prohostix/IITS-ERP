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
  console.log('⚠️ STARTING BULK DELETION OF INVOICE DATA ⚠️');

  try {
    const paymentEntry = await prisma.paymentEntry.deleteMany({});
    console.log(`Deleted ${paymentEntry.count} PaymentEntry records.`);

    const invoice = await prisma.invoice.deleteMany({});
    console.log(`Deleted ${invoice.count} Invoice records.`);

    console.log('✅ ALL INVOICE DATA DELETED SUCCESSFULLY.');
  } catch (err) {
    console.error('❌ Error during deletion:', err);
  } finally {
    process.exit(0);
  }
}

main();
