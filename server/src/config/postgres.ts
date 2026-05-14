import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter: adapter as any });

export const connectPostgres = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL Connected: Local PYPE ERM DB (via Prisma 7 + Driver Adapter)');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
  }
};

export { prisma };
export default prisma;
