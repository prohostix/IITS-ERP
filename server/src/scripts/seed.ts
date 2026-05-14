// @ts-nocheck
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

dotenv.config();

const seedData = async () => {
  try {
    console.log('🗑️  Clearing existing data...');
    // In PostgreSQL, we use deleteMany on Prisma models
    await prisma.user.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.license.deleteMany({});

    console.log('📝 Creating licenses...');
    const premiumLicense = await prisma.license.create({
      data: {
        name: 'Premium Plan',
        type: 'premium',
        features: ['all_basic', 'up_to_200_users', '50gb_storage', 'advanced_analytics'],
        maxUsers: 200,
        maxStorage: 51200,
        durationMonths: 12,
        price: 29999,
        status: 'active',
      }
    });

    console.log('🏢 Creating system organization...');
    const systemOrg = await prisma.organization.create({
      data: {
        id: 'system',
        name: 'System Administration',
        status: 'active',
        email: 'system@example.com',
        phone: '0000000000',
        address: 'System Address'
      }
    });

    console.log('👤 Creating superadmin...');
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    await prisma.user.create({
      data: {
        userId: 'superadmin',
        organizationId: systemOrg.id,
        email: 'superadmin@erp.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'superadmin' as any,
        status: 'active',
      }
    });

    console.log('🏢 Creating sample organization...');
    const organization = await prisma.organization.create({
      data: {
        name: 'EduTech Global',
        email: 'contact@edutechglobal.com',
        phone: '+1234567891',
        address: '123 Education Street, Tech City, TC 12345',
        status: 'active',
        licenseId: premiumLicense.id,
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });

    console.log('🏛️  Creating departments...');
    const opsDept = await prisma.department.create({
      data: {
        organizationId: organization.id,
        name: 'Operations',
        type: 'operations',
        features: ['universities', 'programs', 'centers', 'students', 'admissions'],
        status: 'active',
      }
    });

    console.log('👥 Creating users...');
    const users = [
      { id: 'admin', email: 'admin@edutechglobal.com', password: 'orgadmin123', name: 'Organization Admin', role: 'org_admin' },
      { id: 'ceo', email: 'ceo@edutechglobal.com', password: 'ceo123', name: 'CEO', role: 'ceo' },
      { id: 'ops-admin', email: 'ops.admin@edutechglobal.com', password: 'opsadmin123', name: 'Ops Admin', role: 'ops_admin' },
      { id: 'finance-admin', email: 'finance.admin@edutechglobal.com', password: 'finance123', name: 'Finance Admin', role: 'finance_admin' },
      { id: 'hr-admin', email: 'hr.admin@edutechglobal.com', password: 'hradmin123', name: 'HR Admin', role: 'hr_admin' },
      { id: 'sales-admin', email: 'sales.admin@edutechglobal.com', password: 'sales123', name: 'Sales Admin', role: 'sales_admin' },
      { id: 'ops-exec', email: 'ops.executive@edutechglobal.com', password: 'employee123', name: 'Operations Executive', role: 'employee' },
    ];

    for (const user of users) {
      const hashedUserPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          email: user.email,
          password: hashedUserPassword,
          name: user.name,
          role: user.role as any,
          status: 'active',
        }
      });
    }

    console.log('\n✅ Database seeded successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
