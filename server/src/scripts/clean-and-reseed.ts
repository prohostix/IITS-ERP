import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Organization from '../models/Organization.js';
import License from '../models/License.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Student from '../models/Student.js';
import University from '../models/University.js';
import Program from '../models/Program.js';
import StudyCenter from '../models/StudyCenter.js';
import Task from '../models/Task.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Vacancy from '../models/Vacancy.js';
import Holiday from '../models/Holiday.js';
import Complaint from '../models/Complaint.js';
import Announcement from '../models/Announcement.js';
import Invoice from '../models/Invoice.js';
import PaymentEntry from '../models/PaymentEntry.js';
import ExpenseClaim from '../models/ExpenseClaim.js';
import Lead from '../models/Lead.js';
import Target from '../models/Target.js';
import Escalation from '../models/Escalation.js';
import Payroll from '../models/Payroll.js';
import AdmissionSession from '../models/AdmissionSession.js';
import InternalMark from '../models/InternalMark.js';
import FeeStructure from '../models/FeeStructure.js';

dotenv.config();

/**
 * Clean and Reseed Database
 * Removes all old demo data and creates fresh data with new department structure
 */

const cleanAndReseed = async () => {
  try {
    await connectDatabase();

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         Clean and Reseed Database                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Step 1: Clear all existing data
    console.log('🗑️  Step 1: Clearing all existing data...\n');
    
    const collections: Array<{ name: string; model: any }> = [
      { name: 'Organizations', model: Organization },
      { name: 'Licenses', model: License },
      { name: 'Users', model: User },
      { name: 'Departments', model: Department },
      { name: 'Students', model: Student },
      { name: 'Universities', model: University },
      { name: 'Programs', model: Program },
      { name: 'Study Centers', model: StudyCenter },
      { name: 'Tasks', model: Task },
      { name: 'Leave Requests', model: LeaveRequest },
      { name: 'Attendance', model: Attendance },
      { name: 'Vacancies', model: Vacancy },
      { name: 'Holidays', model: Holiday },
      { name: 'Complaints', model: Complaint },
      { name: 'Announcements', model: Announcement },
      { name: 'Invoices', model: Invoice },
      { name: 'Payments', model: PaymentEntry },
      { name: 'Expenses', model: ExpenseClaim },
      { name: 'Leads', model: Lead },
      { name: 'Targets', model: Target },
      { name: 'Escalations', model: Escalation },
      { name: 'Payroll', model: Payroll },
      { name: 'Admission Sessions', model: AdmissionSession },
      { name: 'Internal Marks', model: InternalMark },
      { name: 'Fee Structures', model: FeeStructure },
    ];

    for (const collection of collections) {
      const count = await collection.model.countDocuments();
      if (count > 0) {
        await collection.model.deleteMany({});
        console.log(`   ✓ Cleared ${collection.name}: ${count} records deleted`);
      }
    }

    console.log('\n✅ All old data cleared successfully!\n');

    // Step 2: Create Licenses
    console.log('📝 Step 2: Creating licenses...\n');
    
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

    console.log('   ✓ Basic License created');
    console.log('   ✓ Premium License created');
    console.log('   ✓ Enterprise License created\n');

    // Step 3: Create Superadmin
    console.log('👤 Step 3: Creating superadmin...\n');
    
    const superadmin = await User.create({
      organizationId: new mongoose.Types.ObjectId(),
      email: 'superadmin@erp.com',
      password: 'superadmin123',
      name: 'Super Admin',
      role: 'superadmin',
      phone: '+1234567890',
      status: 'active',
    });

    console.log('   ✓ Superadmin created\n');

    // Step 4: Create Organization
    console.log('🏢 Step 4: Creating organization...\n');
    
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

    console.log('   ✓ Organization created\n');

    // Step 5: Create Departments with New Structure
    console.log('🏛️  Step 5: Creating departments with new structure...\n');

    const departments = {
      operations: await Department.create({
        organizationId: organization._id,
        name: 'Operations',
        type: 'operations',
        features: [
          'universities',
          'programs',
          'study_centers',
          'students',
          'admissions',
          'internal_marks',
          'announcements',
          'sub_departments',
          'credential_requests',
          'edit_delete_requests',
        ],
        status: 'active',
      }),

      finance: await Department.create({
        organizationId: organization._id,
        name: 'Finance',
        type: 'finance',
        features: [
          'invoices',
          'payments',
          'expenses',
          'targets',
          'approvals',
          'gst_settings',
          'payment_distributions',
          'rereg_management',
          'incentive_structures',
          'credential_approvals',
          'edit_delete_approvals',
          'session_approvals',
          'fee_structures',
        ],
        status: 'active',
      }),

      hr: await Department.create({
        organizationId: organization._id,
        name: 'Human Resources',
        type: 'hr',
        features: [
          'employees',
          'attendance',
          'leaves',
          'recruitment',
          'complaints',
          'payroll',
          'vacancies',
          'holidays',
          'employee_transfers',
          'performance_tracking',
          'two_step_leave_approval',
        ],
        status: 'active',
      }),

      sales: await Department.create({
        organizationId: organization._id,
        name: 'Sales & CRM',
        type: 'sales',
        features: [
          'leads',
          'deals',
          'referrals',
          'targets',
          'lead_pipeline',
          'referral_links',
          'referral_tracking',
          'performance_metrics',
        ],
        status: 'active',
      }),

      ceo: await Department.create({
        organizationId: organization._id,
        name: 'CEO Office',
        type: 'ceo',
        features: [
          'performance_metrics',
          'risk_metrics',
          'escalation_management',
          'multiple_ceo_panels',
          'department_overview',
          'organization_analytics',
          'strategic_insights',
        ],
        status: 'active',
      }),

      orgAdmin: await Department.create({
        organizationId: organization._id,
        name: 'Organization Admin',
        type: 'org_admin',
        features: [
          'custom_departments',
          'ceo_panels',
          'organization_settings',
          'user_management',
          'department_management',
          'license_management',
        ],
        status: 'active',
      }),

      studyCenter: await Department.create({
        organizationId: organization._id,
        name: 'Study Centers',
        type: 'study_center',
        features: [
          'session_requests',
          'student_management',
          'rereg_handling',
          'announcements',
          'center_operations',
        ],
        status: 'active',
      }),

      staff: await Department.create({
        organizationId: organization._id,
        name: 'Staff Portal',
        type: 'staff',
        features: [
          'leave_requests',
          'complaints',
          'announcements',
          'holidays',
          'attendance_view',
          'payroll_view',
          'profile_management',
        ],
        status: 'active',
      }),
    };

    console.log('   ✓ Operations Department created (10 features)');
    console.log('   ✓ Finance Department created (13 features)');
    console.log('   ✓ Human Resources Department created (11 features)');
    console.log('   ✓ Sales & CRM Department created (8 features)');
    console.log('   ✓ CEO Office Department created (7 features)');
    console.log('   ✓ Organization Admin Department created (6 features)');
    console.log('   ✓ Study Centers Department created (5 features)');
    console.log('   ✓ Staff Portal Department created (7 features)\n');

    // Step 6: Create Users with New Roles
    console.log('👥 Step 6: Creating users with new department structure...\n');

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
      departmentId: departments.operations._id,
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
      departmentId: departments.finance._id,
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
      departmentId: departments.hr._id,
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
      departmentId: departments.sales._id,
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
      departmentId: departments.operations._id,
      email: 'ops.executive@edutechglobal.com',
      password: 'employee123',
      name: 'Operations Executive',
      role: 'employee',
      phone: '+1234567898',
      designation: 'Executive',
      reportingTo: opsAdmin._id,
      status: 'active',
    });

    await User.create({
      organizationId: organization._id,
      departmentId: departments.studyCenter._id,
      email: 'center.admin@edutechglobal.com',
      password: 'centeradmin123',
      name: 'Study Center Admin',
      role: 'center_admin',
      phone: '+1234567899',
      designation: 'Center Manager',
      reportingTo: opsAdmin._id,
      status: 'active',
    });

    console.log('   ✓ Organization Admin created');
    console.log('   ✓ CEO created');
    console.log('   ✓ Operations Admin created');
    console.log('   ✓ Finance Admin created');
    console.log('   ✓ HR Admin created');
    console.log('   ✓ Sales Admin created');
    console.log('   ✓ Employee created\n');

    // Summary
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    Summary                                ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  ✅ Old demo data removed                                ║');
    console.log('║  ✅ 3 Licenses created                                   ║');
    console.log('║  ✅ 1 Organization created                               ║');
    console.log('║  ✅ 8 Departments created (new structure)                ║');
    console.log('║  ✅ 8 Users created                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

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

    console.log('🎯 Department Structure:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Operations        - 10 features');
    console.log('2. Finance           - 13 features');
    console.log('3. Human Resources   - 11 features');
    console.log('4. Sales & CRM       - 8 features');
    console.log('5. CEO Office        - 7 features');
    console.log('6. Organization Admin- 6 features');
    console.log('7. Study Centers     - 5 features');
    console.log('8. Staff Portal      - 7 features');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Database cleaned and reseeded successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning and reseeding database:', error);
    process.exit(1);
  }
};

cleanAndReseed();
