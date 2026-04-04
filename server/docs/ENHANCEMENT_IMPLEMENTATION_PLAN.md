# ERP System Enhancement Implementation Plan

## Overview
This document tracks the implementation of all new features and enhancements for the IITS RPS ERP system as specified in the enhancement prompt.

## Implementation Status

### Phase 1: Core Infrastructure & Models ⏳
- [ ] 1.1 Custom Department Creation
- [ ] 1.2 Multiple CEO Panels
- [ ] 2.1 CEO Dashboard Metrics
- [ ] 2.2 Automated Escalation Engine
- [ ] 3.1 Sub-Department Portals
- [ ] 3.2 Credential Visibility Workflow
- [ ] 3.3 Edit/Delete Request Workflow

### Phase 2: Finance & Operations Enhancements ⏳
- [ ] 4.1 Targets & Incentives
- [ ] 4.2 REREG Module
- [ ] 4.3 Pending Fees Display
- [ ] 4.4 Payment Distributions
- [ ] 4.5 GST Settings
- [ ] 4.6 Entry Deletion Audit
- [ ] 4.7 Sales Employee Data Access
- [ ] 4.8 Admission Session Approval

### Phase 3: HR & Sales Features ⏳
- [ ] 5.1 Vacancy-Linked Employee Hiring
- [ ] 5.2 Two-Step Leave Approval
- [ ] 5.3 Employee Transfer
- [ ] 5.4 Complaints Page
- [ ] 5.5 Performance Visibility
- [ ] 6.1 Referral Links
- [ ] 6.2 Targets View
- [ ] 6.3 Lead Pipeline

### Phase 4: Study Centers & Staff Portal ⏳
- [ ] 7.1 Session-Based Student Addition
- [ ] 7.2 REREG Handling
- [ ] 7.3 Announcements
- [ ] 8.0 Staff Portal Module

### Phase 5: Access Control & Data Propagation ⏳
- [ ] 9.0 Updated RBAC Hierarchy
- [ ] 10.0 Global Data Ecosystem

## New Models Required

### Organization Admin
1. **CustomDepartment** - Custom department configurations
2. **CeoPanel** - Multiple CEO panel configurations

### CEO Dashboard
3. **EscalationLog** - Task escalation tracking
4. **PerformanceMetric** - Cached performance calculations
5. **RiskMetric** - Cached risk calculations

### Operations
6. **SubDepartment** - Sub-department portals (OpenSchool, Online, Skill, BVoc)
7. **CredentialRequest** - Credential reveal requests to Finance
8. **EditDeleteRequest** - Edit/delete approval workflow

### Finance
9. **Target** - Department/center targets
10. **IncentiveStructure** - Tiered incentive rules
11. **ReregRule** - Re-registration configuration
12. **PaymentDistribution** - Payment split configurations
13. **GSTSetting** - GST configuration per fee type
14. **DeletionAudit** - Enhanced audit log for deletions

### HR
15. **Vacancy** (Enhanced) - Vacancy-linked hiring
16. **EmployeeTransfer** - Transfer history
17. **TwoStepLeaveApproval** - Enhanced leave workflow

### Sales
18. **ReferralLink** - BDE referral tracking
19. **LeadPipeline** - CRM pipeline stages

### Study Centers
20. **SessionRequest** - Session approval workflow

### Staff Portal
21. **StaffComplaint** - Employee complaints

## New API Routes Required

### Organization Admin (`/api/org`)
- POST `/departments` - Create custom department
- GET `/departments` - List all departments
- POST `/ceo-panels` - Create CEO panel
- GET `/ceo-panels` - List CEO panels
- PATCH `/ceo-panels/:id` - Update CEO panel

### CEO Dashboard (`/api/ceo`)
- GET `/metrics/performance` - Performance metrics
- GET `/metrics/risk` - Risk metrics
- GET `/escalations` - List escalations
- PATCH `/escalations/:id` - Resolve/reassign escalation

### Operations (`/api/ops`)
- POST `/sub-departments` - Create sub-department
- GET `/sub-departments` - List sub-departments
- POST `/credential-requests` - Request credential access
- GET `/credential-requests` - List requests
- POST `/edit-delete-requests` - Submit edit/delete request
- GET `/referred/centers` - List referred centers
- GET `/referred/students` - List referred students

### Finance (`/api/finance`)
- POST `/targets` - Create target
- GET `/targets` - List targets
- POST `/incentives` - Create incentive structure
- GET `/incentives` - List incentives
- POST `/rereg-rules` - Configure REREG rules
- GET `/rereg-rules` - Get REREG configuration
- GET `/rereg/pending` - Pending re-registrations
- GET `/rereg/completed` - Completed re-registrations
- POST `/payment-distributions` - Configure payment splits
- GET `/payment-distributions` - List distributions
- POST `/gst-settings` - Configure GST
- GET `/gst-settings` - List GST settings
- PATCH `/credential-requests/:id` - Approve/reject credential request
- PATCH `/edit-delete-requests/:id` - Approve/reject edit/delete
- GET `/sales-employee-data` - Sales employee metrics
- GET `/admission-sessions/pending` - Pending session approvals
- PATCH `/admission-sessions/:id/approve` - Approve session

### HR (`/api/hr`)
- POST `/vacancies` (Enhanced) - Create vacancy with count
- GET `/vacancies/open` - List open vacancies
- PATCH `/employees/:id/transfer` - Transfer employee
- GET `/employees/transfers` - Transfer history
- GET `/complaints` - List employee complaints
- PATCH `/complaints/:id` - Update complaint status
- GET `/performance/employees` - Employee performance
- GET `/performance/departments` - Department performance
- PATCH `/leaves/:id/dept-approve` - Department admin approval
- PATCH `/leaves/:id/hr-approve` - HR final approval

### Sales (`/api/sales`)
- POST `/referral-links` - Generate referral link
- GET `/referral-links` - List referral links
- GET `/referrals/centers` - Centers referred
- GET `/referrals/students` - Students referred
- GET `/referrals/metrics` - Referral metrics
- GET `/targets` - View assigned targets
- GET `/pipeline` - Lead pipeline view
- PATCH `/pipeline/:id` - Update lead stage

### Study Centers (`/api/centers`)
- POST `/session-requests` - Request session
- GET `/session-requests` - List session requests
- POST `/rereg/:studentId` - Initiate re-registration
- GET `/announcements` - View center announcements

### Staff Portal (`/api/staff`)
- GET `/holidays` - View holidays
- GET `/announcements` - View announcements
- POST `/complaints` - Submit complaint
- POST `/leave-requests` - Submit leave request

## New Frontend Components Required

### Organization Admin
- `CustomDepartmentForm.tsx`
- `CustomDepartmentList.tsx`
- `CeoPanelForm.tsx`
- `CeoPanelList.tsx`

### CEO Dashboard
- `CeoDashboard.tsx`
- `PerformanceMetrics.tsx`
- `RiskMetrics.tsx`
- `EscalationQueue.tsx`
- `EscalationDetail.tsx`

### Operations
- `SubDepartmentPortal.tsx`
- `CredentialRequestForm.tsx`
- `EditDeleteRequestForm.tsx`
- `ReferredCenters.tsx`
- `ReferredStudents.tsx`

### Finance
- `TargetManagement.tsx`
- `IncentiveStructure.tsx`
- `ReregConfiguration.tsx`
- `ReregQueue.tsx`
- `PaymentDistribution.tsx`
- `GSTSettings.tsx`
- `SalesEmployeeMetrics.tsx`
- `SessionApprovalQueue.tsx`

### HR
- `VacancyManagement.tsx`
- `EmployeeTransfer.tsx`
- `ComplaintsManagement.tsx`
- `PerformanceDashboard.tsx`
- `TwoStepLeaveApproval.tsx`

### Sales
- `ReferralLinkGenerator.tsx`
- `ReferralMetrics.tsx`
- `LeadPipeline.tsx`

### Study Centers
- `SessionRequestForm.tsx`
- `ReregInitiation.tsx`

### Staff Portal
- `StaffPortal.tsx`
- `StaffComplaints.tsx`

## Background Jobs Required

1. **Escalation Engine** - Monitor overdue tasks and escalate
2. **REREG Carryforward** - Auto-carry forward missed re-registrations
3. **Metric Calculation** - Calculate performance and risk metrics
4. **Notification Dispatcher** - Send notifications for approvals/escalations

## Real-Time Events Required

1. Task overdue → Department Admin alert
2. Escalation created → CEO dashboard update
3. Credential request → Finance notification
4. Session approval → Ops notification
5. Leave approval → Employee notification
6. REREG completed → Finance update
7. Student admission → Fee record creation

## Database Schema Changes

### Existing Models to Enhance
- `Department` - Add `type`, `features[]`, `customConfig`
- `User` - Add `subDepartmentId`, `ceoPanelId`
- `LeaveRequest` - Add `deptAdminStatus`, `hrStatus`, `deptAdminApprovedAt`, `hrApprovedAt`
- `Vacancy` - Add `totalCount`, `filledCount`
- `Student` - Add `referredBy`, `reregStatus`, `pendingFees[]`
- `StudyCenter` - Add `referredBy`, `sessionRequests[]`
- `AdmissionSession` - Add `approvalStatus`, `approvedBy`, `approvedAt`
- `Announcement` - Add `audience` field

### New Indexes Required
```javascript
// Performance optimization
EscalationLog: { taskId: 1, status: 1, escalatedAt: -1 }
CredentialRequest: { requesterId: 1, status: 1 }
ReferralLink: { employeeId: 1, slug: 1 }
SessionRequest: { centerId: 1, status: 1 }
```

## Implementation Priority

### Week 1: Foundation
1. Create all new models
2. Update existing models with new fields
3. Implement RBAC updates
4. Set up background job infrastructure

### Week 2: CEO & Org Admin
1. CEO Dashboard with metrics
2. Escalation engine
3. Custom departments
4. Multiple CEO panels

### Week 3: Operations & Finance
1. Sub-department portals
2. Credential workflow
3. REREG module
4. Targets & incentives

### Week 4: HR & Sales
1. Vacancy-linked hiring
2. Two-step leave approval
3. Referral links
4. Lead pipeline

### Week 5: Study Centers & Staff Portal
1. Session-based student addition
2. Staff portal module
3. Complaints system

### Week 6: Integration & Testing
1. Data propagation events
2. Real-time updates
3. End-to-end testing
4. Performance optimization

## Technical Stack Additions

### Backend
- **Bull** - Job queue for background tasks
- **Redis** - Queue backend and caching
- **Socket.io** - Real-time updates
- **node-cron** - Scheduled jobs
- **ip** - IP address logging

### Frontend
- **Recharts** or **Chart.js** - Metric visualizations
- **React DnD** - Kanban board for lead pipeline
- **Socket.io-client** - Real-time updates

## Next Steps

1. Review and approve this implementation plan
2. Set up Redis and Bull for background jobs
3. Begin Phase 1 implementation
4. Create migration scripts for existing data
5. Set up testing framework for new features

---

**Status**: Planning Complete - Ready for Implementation
**Estimated Timeline**: 6 weeks
**Last Updated**: March 5, 2026
