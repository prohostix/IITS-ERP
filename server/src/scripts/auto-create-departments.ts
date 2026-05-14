import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Department from '../models/Department.js';
import Organization from '../models/Organization.js';

dotenv.config();

/**
 * Automatic Department Creation Script
 * Creates all departments with their specific features and functions
 * Based on the comprehensive ERP specification
 */

interface DepartmentConfig {
  name: string;
  type: string;
  description: string;
  features: string[];
  functions: string[];
  permissions: string[];
  subDepartments?: string[];
}

const DEPARTMENT_CONFIGURATIONS: DepartmentConfig[] = [
  {
    name: 'Operations',
    type: 'operations',
    description: 'Manages universities, programs, study centers, students, and admissions',
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
    functions: [
      'Create and manage universities',
      'Create and manage programs',
      'Create and manage study centers',
      'Student enrollment and management',
      'Admission session management',
      'Internal marks entry',
      'Announcements to students',
      'Request credentials from Finance',
      'Request edit/delete permissions',
      'View referred centers and students',
    ],
    permissions: [
      'view_universities',
      'create_universities',
      'edit_universities',
      'delete_universities',
      'view_programs',
      'create_programs',
      'edit_programs',
      'delete_programs',
      'view_study_centers',
      'create_study_centers',
      'edit_study_centers',
      'delete_study_centers',
      'view_students',
      'create_students',
      'edit_students',
      'view_admissions',
      'create_admissions',
      'view_internal_marks',
      'create_internal_marks',
      'create_announcements',
      'request_credentials',
      'request_edit_delete',
    ],
    subDepartments: ['OpenSchool', 'Online', 'Skill', 'BVoc'],
  },
  {
    name: 'Finance',
    type: 'finance',
    description: 'Manages invoices, payments, expenses, targets, GST, and approvals',
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
    functions: [
      'Create and manage invoices',
      'Process payments',
      'Track expenses',
      'Set department and center targets',
      'Configure GST settings',
      'Manage payment distributions',
      'Configure REREG rules',
      'Create incentive structures',
      'Approve credential requests',
      'Approve edit/delete requests',
      'Approve admission sessions',
      'View sales employee data',
      'Manage fee structures',
      'Auto-calculate GST on invoices',
      'Audit trail for deletions',
    ],
    permissions: [
      'view_invoices',
      'create_invoices',
      'edit_invoices',
      'delete_invoices',
      'view_payments',
      'create_payments',
      'edit_payments',
      'delete_payments',
      'view_expenses',
      'create_expenses',
      'approve_expenses',
      'view_targets',
      'create_targets',
      'edit_targets',
      'view_gst_settings',
      'manage_gst_settings',
      'view_payment_distributions',
      'manage_payment_distributions',
      'view_rereg',
      'manage_rereg',
      'view_incentives',
      'manage_incentives',
      'approve_credentials',
      'approve_edit_delete',
      'approve_sessions',
      'view_sales_data',
      'view_fee_structures',
      'manage_fee_structures',
    ],
  },
  {
    name: 'Human Resources',
    type: 'hr',
    description: 'Manages employees, attendance, leaves, recruitment, payroll, and complaints',
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
    functions: [
      'Employee management',
      'Attendance tracking with geolocation',
      'Leave request management',
      'Two-step leave approval (Dept → HR)',
      'Vacancy management with position tracking',
      'Vacancy-linked employee hiring',
      'Employee transfer management',
      'Payroll processing',
      'Payroll to Finance transfer',
      'Holiday calendar management',
      'Employee complaints management',
      'Performance visibility',
      'Configure office hours and late tracking',
    ],
    permissions: [
      'view_employees',
      'create_employees',
      'edit_employees',
      'delete_employees',
      'view_attendance',
      'mark_attendance',
      'edit_attendance',
      'view_leaves',
      'create_leaves',
      'dept_approve_leaves',
      'hr_approve_leaves',
      'view_vacancies',
      'create_vacancies',
      'edit_vacancies',
      'close_vacancies',
      'validate_vacancy_hiring',
      'view_payroll',
      'create_payroll',
      'process_payroll',
      'transfer_payroll_to_finance',
      'view_holidays',
      'create_holidays',
      'edit_holidays',
      'view_complaints',
      'manage_complaints',
      'view_performance',
      'transfer_employees',
    ],
  },
  {
    name: 'Sales & CRM',
    type: 'sales',
    description: 'Manages leads, deals, referrals, targets, and CRM pipeline',
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
    functions: [
      'Lead management',
      'Deal tracking',
      'Generate referral links',
      'Track referred centers',
      'Track referred students',
      'View referral metrics',
      'View assigned targets',
      'Lead pipeline management',
      'CRM pipeline stages',
      'Performance tracking',
      'Access to referred data only',
    ],
    permissions: [
      'view_leads',
      'create_leads',
      'edit_leads',
      'delete_leads',
      'view_deals',
      'create_deals',
      'edit_deals',
      'view_targets',
      'generate_referral_links',
      'view_referral_metrics',
      'view_referred_centers',
      'view_referred_students',
      'view_pipeline',
      'update_pipeline',
      'view_own_performance',
    ],
  },
  {
    name: 'CEO Office',
    type: 'ceo',
    description: 'Executive dashboard with performance metrics, risk analysis, and escalations',
    features: [
      'performance_metrics',
      'risk_metrics',
      'escalation_management',
      'multiple_ceo_panels',
      'department_overview',
      'organization_analytics',
      'strategic_insights',
    ],
    functions: [
      'View performance metrics',
      'View risk metrics',
      'Manage escalations',
      'Resolve escalated tasks',
      'Reassign escalations',
      'View all department data',
      'Access multiple CEO panels',
      'Organization-wide analytics',
      'Strategic decision support',
      'Auto-escalation monitoring',
    ],
    permissions: [
      'view_all_data',
      'view_performance_metrics',
      'view_risk_metrics',
      'view_escalations',
      'resolve_escalations',
      'reassign_escalations',
      'view_ceo_panels',
      'access_all_departments',
      'view_organization_analytics',
    ],
  },
  {
    name: 'Organization Admin',
    type: 'org_admin',
    description: 'Organization-level administration and custom department management',
    features: [
      'custom_departments',
      'ceo_panels',
      'organization_settings',
      'user_management',
      'department_management',
      'license_management',
    ],
    functions: [
      'Create custom departments',
      'Configure department features',
      'Create multiple CEO panels',
      'Manage CEO panel access',
      'Organization settings',
      'User management',
      'Department hierarchy',
      'License management',
      'System configuration',
    ],
    permissions: [
      'create_custom_departments',
      'edit_custom_departments',
      'delete_custom_departments',
      'create_ceo_panels',
      'edit_ceo_panels',
      'delete_ceo_panels',
      'manage_organization',
      'manage_users',
      'manage_departments',
      'manage_licenses',
      'view_all_data',
    ],
  },
  {
    name: 'Study Centers',
    type: 'study_center',
    description: 'Study center operations, session requests, and student management',
    features: [
      'session_requests',
      'student_management',
      'rereg_handling',
      'announcements',
      'center_operations',
    ],
    functions: [
      'Request admission sessions',
      'Session-based student addition',
      'Initiate re-registration',
      'Handle REREG process',
      'View center announcements',
      'Manage center students',
      'Track center performance',
    ],
    permissions: [
      'create_session_requests',
      'view_session_requests',
      'add_students_to_session',
      'initiate_rereg',
      'view_announcements',
      'view_center_students',
      'view_center_performance',
    ],
  },
  {
    name: 'Staff Portal',
    type: 'staff',
    description: 'Employee self-service portal for leaves, complaints, and announcements',
    features: [
      'leave_requests',
      'complaints',
      'announcements',
      'holidays',
      'attendance_view',
      'payroll_view',
      'profile_management',
    ],
    functions: [
      'Submit leave requests',
      'View leave status',
      'Submit complaints',
      'View announcements',
      'View holiday calendar',
      'View own attendance',
      'View own payroll',
      'Update profile',
    ],
    permissions: [
      'create_leave_requests',
      'view_own_leaves',
      'create_complaints',
      'view_announcements',
      'view_holidays',
      'view_own_attendance',
      'view_own_payroll',
      'edit_own_profile',
    ],
  },
];

const autoCreateDepartments = async () => {
  try {
    await connectDatabase();

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     Automatic Department Creation System                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Get the first organization (or create one if none exists)
    let organization = await Organization.findOne();
    
    if (!organization) {
      console.log('⚠️  No organization found. Please run seed script first.');
      process.exit(1);
    }

    console.log(`📋 Organization: ${organization.name}`);
    console.log(`🆔 Organization ID: ${organization._id}\n`);

    // Clear existing departments (optional - comment out if you want to keep existing)
    // await Department.deleteMany({ organizationId: organization._id });
    // console.log('🗑️  Cleared existing departments\n');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const config of DEPARTMENT_CONFIGURATIONS) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📁 Processing: ${config.name}`);
      console.log(`   Type: ${config.type}`);
      console.log(`   Features: ${config.features.length}`);
      console.log(`   Functions: ${config.functions.length}`);
      console.log(`   Permissions: ${config.permissions.length}`);

      // Check if department already exists
      const existing = await Department.findOne({
        organizationId: organization._id,
        type: config.type,
      });

      if (existing) {
        console.log(`   ⚠️  Department already exists - Updating...`);
        
        // Update existing department
        existing.name = config.name;
        existing.features = config.features;
        existing.status = 'active';
        await existing.save();
        
        updated++;
        console.log(`   ✅ Updated successfully`);
      } else {
        // Create new department
        const department = await Department.create({
          organizationId: organization._id,
          name: config.name,
          type: config.type,
          features: config.features,
          status: 'active',
        });

        created++;
        console.log(`   ✅ Created successfully`);
        console.log(`   🆔 Department ID: ${department._id}`);
      }

      // Display functions
      console.log(`\n   📋 Functions:`);
      config.functions.forEach((func, idx) => {
        console.log(`      ${idx + 1}. ${func}`);
      });

      // Display sub-departments if any
      if (config.subDepartments && config.subDepartments.length > 0) {
        console.log(`\n   🏢 Sub-Departments:`);
        config.subDepartments.forEach((sub, idx) => {
          console.log(`      ${idx + 1}. ${sub}`);
        });
      }

      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    Summary                                ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Total Departments:     ${DEPARTMENT_CONFIGURATIONS.length}                                    ║`);
    console.log(`║  Created:               ${created}                                    ║`);
    console.log(`║  Updated:               ${updated}                                    ║`);
    console.log(`║  Skipped:               ${skipped}                                    ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Display department summary
    console.log('📊 Department Summary:\n');
    
    const departments = await Department.find({ organizationId: organization._id });
    
    for (const dept of departments) {
      const config = DEPARTMENT_CONFIGURATIONS.find(c => c.type === dept.type);
      console.log(`   ${dept.name}`);
      console.log(`   ├─ Type: ${dept.type}`);
      console.log(`   ├─ Features: ${dept.features.length}`);
      console.log(`   ├─ Status: ${dept.status}`);
      if (config) {
        console.log(`   ├─ Functions: ${config.functions.length}`);
        console.log(`   └─ Permissions: ${config.permissions.length}`);
      }
      console.log('');
    }

    console.log('✅ Department creation completed successfully!\n');

    // Export department configurations to JSON for reference
    const fs = await import('fs');
    const configPath = './department-configurations.json';
    fs.writeFileSync(
      configPath,
      JSON.stringify(DEPARTMENT_CONFIGURATIONS, null, 2)
    );
    console.log(`📄 Department configurations exported to: ${configPath}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating departments:', error);
    process.exit(1);
  }
};

// Run the script
autoCreateDepartments();
