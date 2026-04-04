import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Organization from '../models/Organization.js';
import License from '../models/License.js';
import User from '../models/User.js';
import Department from '../models/Department.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDatabase();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Organization.deleteMany({});
    await License.deleteMany({});
    await User.deleteMany({});
    await Department.deleteMany({});

    // Create Licenses
    console.log('📝 Creating licenses...');
    const basicLicense = await License.create({
      name: 'Basic Plan',
      type: 'basic',
      features: ['basic_features', 'up_to_50_users', '5gb_storage'],
      maxUsers: 50,
      maxStorage: 5120,
      durationMonths: 12,
      price: 9999,
      status: 'active',
    });

    const premiumLicense = await License.create({
      name: 'Premium Plan',
      type: 'premium',
      features: ['all_basic', 'up_to_200_users', '50gb_storage', 'advanced_analytics'],
      maxUsers: 200,
      maxStorage: 51200,
      durationMonths: 12,
      price: 29999,
      status: 'active',
    });

    const enterpriseLicense = await License.create({
      name: 'Enterprise Plan',
      type: 'enterprise',
      features: ['all_premium', 'unlimited_users', '500gb_storage', 'custom_integrations', 'dedicated_support'],
      maxUsers: 10000,
      maxStorage: 512000,
      durationMonths: 12,
      price: 99999,
      status: 'active',
    });

    console.log('✅ Licenses created');

    // Create Superadmin
    console.log('👤 Creating superadmin...');
    const superadmin = await User.create({
      organizationId: new mongoose.Types.ObjectId(),
      email: 'superadmin@erp.com',
      password: 'superadmin123',
      name: 'Super Admin',
      role: 'superadmin',
      phone: '+1234567890',
      status: 'active',
    });

    console.log('✅ Superadmin created');

    // Create Sample Organization
    console.log('🏢 Creating sample organization...');
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 12);

    const organization = await Organization.create({
      name: 'EduTech Global',
      email: 'contact@edutechglobal.com',
      phone: '+1234567891',
      address: '123 Education Street, Tech City, TC 12345',
      status: 'active',
      licenseId: premiumLicense._id,
      licenseExpiry: expiryDate,
    });

    console.log('✅ Organization created');

    // Create Departments
    console.log('🏛️  Creating departments...');
    const opsDept = await Department.create({
      organizationId: organization._id,
      name: 'Operations',
      type: 'operations',
      features: ['universities', 'programs', 'centers', 'students', 'admissions'],
      status: 'active',
    });

    const financeDept = await Department.create({
      organizationId: organization._id,
      name: 'Finance',
      type: 'finance',
      features: ['invoices', 'payments', 'expenses', 'targets', 'approvals'],
      status: 'active',
    });

    const hrDept = await Department.create({
      organizationId: organization._id,
      name: 'Human Resources',
      type: 'hr',
      features: ['employees', 'attendance', 'leaves', 'recruitment', 'complaints'],
      status: 'active',
    });

    const salesDept = await Department.create({
      organizationId: organization._id,
      name: 'Sales & CRM',
      type: 'sales',
      features: ['leads', 'deals', 'referrals', 'targets'],
      status: 'active',
    });

    console.log('✅ Departments created');

    // Create Users
    console.log('👥 Creating users...');
    
    const orgAdmin = await User.create({
      organizationId: organization._id,
      email: 'admin@edutechglobal.com',
      password: 'orgadmin123',
      name: 'Organization Admin',
      role: 'org_admin',
      phone: '+1234567892',
      status: 'active',
    });

    const ceo = await User.create({
      organizationId: organization._id,
      email: 'ceo@edutechglobal.com',
      password: 'ceo123',
      name: 'Chief Executive Officer',
      role: 'ceo',
      phone: '+1234567893',
      designation: 'CEO',
      status: 'active',
    });

    const opsAdmin = await User.create({
      organizationId: organization._id,
      departmentId: opsDept._id,
      email: 'ops.admin@edutechglobal.com',
      password: 'opsadmin123',
      name: 'Operations Admin',
      role: 'ops_admin',
      phone: '+1234567894',
      designation: 'Operations Manager',
      reportingTo: ceo._id,
      status: 'active',
    });

    const financeAdmin = await User.create({
      organizationId: organization._id,
      departmentId: financeDept._id,
      email: 'finance.admin@edutechglobal.com',
      password: 'finance123',
      name: 'Finance Admin',
      role: 'finance_admin',
      phone: '+1234567895',
      designation: 'Finance Manager',
      reportingTo: ceo._id,
      status: 'active',
    });

    const hrAdmin = await User.create({
      organizationId: organization._id,
      departmentId: hrDept._id,
      email: 'hr.admin@edutechglobal.com',
      password: 'hradmin123',
      name: 'HR Admin',
      role: 'hr_admin',
      phone: '+1234567896',
      designation: 'HR Manager',
      reportingTo: ceo._id,
      status: 'active',
    });

    const salesAdmin = await User.create({
      organizationId: organization._id,
      departmentId: salesDept._id,
      email: 'sales.admin@edutechglobal.com',
      password: 'sales123',
      name: 'Sales Admin',
      role: 'sales_admin',
      phone: '+1234567897',
      designation: 'Sales Manager',
      reportingTo: ceo._id,
      status: 'active',
    });

    const employee = await User.create({
      organizationId: organization._id,
      departmentId: opsDept._id,
      email: 'ops.executive@edutechglobal.com',
      password: 'employee123',
      name: 'Operations Executive',
      role: 'employee',
      phone: '+1234567898',
      designation: 'Executive',
      reportingTo: opsAdmin._id,
      status: 'active',
    });

    const centerAdmin = await User.create({
      organizationId: organization._id,
      departmentId: opsDept._id,
      email: 'center.admin@edutechglobal.com',
      password: 'centeradmin123',
      name: 'Study Center Admin',
      role: 'center_admin',
      phone: '+1234567899',
      designation: 'Center Manager',
      reportingTo: opsAdmin._id,
      status: 'active',
    });

    console.log('✅ Users created');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Superadmin:      superadmin@erp.com / superadmin123');
    console.log('Org Admin:       admin@edutechglobal.com / orgadmin123');
    console.log('CEO:             ceo@edutechglobal.com / ceo123');
    console.log('Ops Admin:       ops.admin@edutechglobal.com / opsadmin123');
    console.log('Finance Admin:   finance.admin@edutechglobal.com / finance123');
    console.log('HR Admin:        hr.admin@edutechglobal.com / hradmin123');
    console.log('Sales Admin:     sales.admin@edutechglobal.com / sales123');
    console.log('Employee:        ops.executive@edutechglobal.com / employee123');
    console.log('Study Center:    center.admin@edutechglobal.com / centeradmin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
