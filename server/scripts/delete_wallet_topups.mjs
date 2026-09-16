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
  console.log('⚠️ STARTING BULK DELETION OF WALLET TOP-UPS ⚠️');

  try {
    const topups = await prisma.walletTopUp.deleteMany({});
    console.log(`Deleted ${topups.count} WalletTopUp records.`);

    const wallets = await prisma.studyCenterWallet.updateMany({
      data: {
        balance: 0
      }
    });
    console.log(`Reset ${wallets.count} StudyCenterWallet balances to 0.`);

    console.log('✅ ALL WALLET TOP-UP DATA DELETED SUCCESSFULLY.');
  } catch (err) {
    console.error('❌ Error during deletion:', err);
  } finally {
    process.exit(0);
  }
}

main();
