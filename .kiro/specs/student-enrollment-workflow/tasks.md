# Implementation Plan: Student Enrollment Workflow

## Overview

Implement the multi-stage student enrollment pipeline: Finance configures program fees → Study Center tops up wallet → Study Center initiates enrollment (atomic wallet debit) → Dept/Sub-dept manager reviews documents → Finance Admin grants final enrollment. Covers 5 new Mongoose models, new backend controllers/routes, Finance Dashboard extensions, a new Study Center Dashboard page, and Operations Dashboard additions.

## Tasks

- [ ] 1. Create the five new Mongoose models
  - [ ] 1.1 Create `ProgramFeeStructure` model
    - File: `server/src/models/ProgramFeeStructure.ts`
    - Fields: `programId` (ref Program, unique), `organizationId`, `billingCycle` enum, `baseFee` (≥0), `additionalFees[]` (`label`, `amount`, optional `description`), `createdBy`
    - Add unique index on `programId`, compound index on `organizationId`
    - _Requirements: 1.1, 1.2, 1.3, 1.8_

  - [ ]* 1.2 Write property test for ProgramFeeStructure validation (P1)
    - **Property 1: Fee structure validation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
    - Use `fc.record` with random billingCycle, baseFee, additionalFees; assert accept/reject

  - [ ] 1.3 Create `StudyCenterWallet` model
    - File: `server/src/models/StudyCenterWallet.ts`
    - Fields: `studyCenterId` (ref StudyCenter, unique), `organizationId`, `balance` (default 0, min 0)
    - Unique index on `studyCenterId`
    - _Requirements: 3.5, 4.1, 4.2, 4.3_

  - [ ] 1.4 Create `WalletTopUp` model
    - File: `server/src/models/WalletTopUp.ts`
    - Fields: `studyCenterId`, `organizationId`, `amount` (>0), `paymentMethod` enum, `referenceNumber?`, `proofDocument?`, `status` enum (pending/approved/rejected), `remarks?`, `verifiedBy?`, `verifiedAt?`
    - Compound indexes: `{ studyCenterId, status }`, `{ organizationId, status }`
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.9_

  - [ ] 1.5 Create `Enrollment` model
    - File: `server/src/models/Enrollment.ts`
    - Fields: `enrollmentNumber` (unique, auto-generated pre-save hook: `ENR-YYYYMMDD-XXXXXX`), `studentName`, `studentEmail`, `studentPhone`, `studentAddress`, `programId`, `studyCenterId`, `organizationId`, `status` enum (7 values), `departmentRemarks?`, `financeRemarks?`, `departmentReviewedBy?`, `departmentReviewedAt?`, `financeReviewedBy?`, `financeReviewedAt?`, `enrolledAt?`, `statusHistory[]` (`status`, `actorId`, `timestamp`, `remarks?`)
    - Export `VALID_TRANSITIONS` constant map
    - Indexes: `{ studyCenterId, status }`, `{ programId, status }`, `{ organizationId, status }`, unique on `enrollmentNumber`
    - _Requirements: 4.5, 4.6, 4.7, 7.1, 7.2, 7.3_

  - [ ]* 1.6 Write property test for unique enrollment numbers (P9)
    - **Property 9: Unique enrollment numbers**
    - **Validates: Requirements 4.7**
    - Generate N enrollments (N in [2,50]), assert all `enrollmentNumber` values are distinct

  - [ ]* 1.7 Write property test for status machine (P10)
    - **Property 10: Enrollment status machine**
    - **Validates: Requirements 3.8, 4.5, 5.2, 5.3, 5.4, 6.4, 6.6, 6.7, 7.1, 7.2**
    - Enumerate all (currentStatus, targetStatus) pairs; assert only VALID_TRANSITIONS entries succeed

  - [ ] 1.8 Create `EnrollmentPayment` model
    - File: `server/src/models/EnrollmentPayment.ts`
    - Fields: `enrollmentId` (ref Enrollment), `studyCenterId`, `walletId` (ref StudyCenterWallet), `amount`, `debitedAt`
    - Unique index on `enrollmentId`, index on `studyCenterId`
    - _Requirements: 4.4_

- [ ] 2. Implement Finance controllers and extend finance routes
  - [ ] 2.1 Create `programFeeController`
    - File: `server/src/controllers/programFeeController.ts`
    - Implement: `getProgramFees`, `createProgramFee`, `getProgramFee`, `updateProgramFee`, `deleteProgramFee`
    - Validate billingCycle enum, baseFee ≥ 0, additionalFees labels non-empty; return 409 on duplicate programId
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.2 Write property test for fee structure update round-trip (P2)
    - **Property 2: Fee structure update round-trip**
    - **Validates: Requirements 1.7**
    - Create fee structure, update with random valid values, retrieve and deep-equal compare

  - [ ] 2.3 Create `walletTopUpController` (Finance side)
    - File: `server/src/controllers/walletTopUpController.ts`
    - Implement: `getWalletTopUps` (list pending, scoped to org), `approveWalletTopUp` (credit wallet atomically, set verifiedBy/verifiedAt), `rejectWalletTopUp` (require remarks, leave balance unchanged)
    - Return 409 if top-up not in `pending` status
    - _Requirements: 3.6, 3.7, 3.8, 3.9_

  - [ ]* 2.4 Write property test for top-up approval credits exact amount (P5)
    - **Property 5: Top-up approval credits exact amount**
    - **Validates: Requirements 3.6, 3.9**
    - For random positive amount A: balance_after = balance_before + A

  - [ ]* 2.5 Write property test for top-up rejection leaves wallet unchanged (P6)
    - **Property 6: Top-up rejection leaves wallet unchanged**
    - **Validates: Requirements 3.7, 3.9**
    - Reject with random non-empty remarks; assert balance unchanged and status = rejected

  - [ ] 2.6 Create `financeEnrollmentController`
    - File: `server/src/controllers/financeEnrollmentController.ts`
    - Implement: `getFinanceEnrollments` (list finance_review/enrolled/rejected scoped to org), `approveFinanceEnrollment` (verify EnrollmentPayment exists, transition to enrolled, set enrolledAt, update Student status to active), `rejectFinanceEnrollment` (require remarks, transition to rejected)
    - Append statusHistory entry on each action
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 2.7 Write property test for finance payment gate (P13)
    - **Property 13: Finance payment gate**
    - **Validates: Requirements 6.2, 6.3**
    - Attempt finance approval with/without EnrollmentPayment; assert gate enforced

  - [ ]* 2.8 Write property test for student record activated on enrollment (P14)
    - **Property 14: Student record activated on enrollment**
    - **Validates: Requirements 6.4, 6.5**
    - Approve enrollment, retrieve Student record, assert status = active and enrolledAt set

  - [ ] 2.9 Extend `server/src/routes/financeRoutes.ts` with enrollment routes
    - Add program-fees CRUD routes (authorize `finance_admin`)
    - Add wallet-topups list + approve/reject routes (authorize `finance_admin`)
    - Add enrollments list + approve/reject routes (authorize `finance_admin`)
    - Import from `programFeeController`, `walletTopUpController`, `financeEnrollmentController`
    - _Requirements: 1.1–1.8, 3.6–3.9, 6.1–6.8_

- [ ] 3. Implement enrollment and review controllers and routes
  - [ ] 3.1 Create `enrollmentController` (Study Center side)
    - File: `server/src/controllers/enrollmentController.ts`
    - Implement: `getWallet` (get or upsert wallet for center), `submitTopUp` (validate amount > 0, offline requires proof/reference, create WalletTopUp with status pending), `getTopUpHistory`, `getEnrollablePrograms` (only programs with ProgramFeeStructure), `createEnrollment` (validate required fields, check fee structure, check balance ≥ fee, MongoDB transaction: debit wallet + create Enrollment + create EnrollmentPayment, auto-transition to document_review, append statusHistory), `getMyEnrollments`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 3.2 Write property test for top-up pending does not credit wallet (P4)
    - **Property 4: Top-up pending does not credit wallet**
    - **Validates: Requirements 3.5**
    - Submit top-up, assert wallet balance unchanged before approval

  - [ ]* 3.3 Write property test for wallet balance invariant (P7)
    - **Property 7: Wallet balance invariant**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.9**
    - Random (balance, fee) pairs: if balance ≥ fee → success and balance_after = balance - fee; if balance < fee → error and balance unchanged; balance never negative

  - [ ]* 3.4 Write property test for EnrollmentPayment created on enrollment (P8)
    - **Property 8: EnrollmentPayment created on enrollment**
    - **Validates: Requirements 4.4**
    - Create enrollment, query EnrollmentPayment by enrollmentId, assert exactly one record with correct amount/studyCenterId/walletId

  - [ ] 3.5 Create `enrollmentReviewController` (Dept/Sub-dept manager side)
    - File: `server/src/controllers/enrollmentReviewController.ts`
    - Implement: `getDeptReviewEnrollments` (list document_review enrollments scoped to user's departmentId/subDepartmentId via program lookup), `approveDeptEnrollment` (transition to finance_review, record reviewedBy/reviewedAt, append statusHistory), `rejectDeptEnrollment` (require remarks, transition to department_rejected, preserve remarks, append statusHistory)
    - Return 409 if enrollment not in document_review; return 403 if dept scope mismatch
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ] 3.6 Create `checkDeptScope` middleware
    - File: `server/src/middleware/checkDeptScope.ts`
    - Populate enrollment → programId → subDepartmentId; match against req.user.subDepartmentId or req.user.departmentId (via SubDepartment lookup)
    - Return 403 with message `"Not authorized to review enrollments for this department"` on mismatch
    - _Requirements: 5.7_

  - [ ]* 3.7 Write property test for scope isolation (P12)
    - **Property 12: Scope isolation**
    - **Validates: Requirements 5.1, 5.7, 8.1, 8.2, 8.3, 8.4, 8.6**
    - Query as each role type; assert only in-scope records returned

  - [ ]* 3.8 Write property test for rejection remarks preserved (P15)
    - **Property 15: Rejection remarks preserved**
    - **Validates: Requirements 5.3, 5.6, 6.6**
    - Reject with `fc.string({ minLength: 1 })` remarks; retrieve enrollment; assert remarks match

  - [ ]* 3.9 Write property test for status history grows on each transition (P11)
    - **Property 11: Status history grows on each transition**
    - **Validates: Requirements 7.3**
    - Perform valid transition; assert statusHistory.length increases by exactly 1 with correct status/actorId/timestamp

  - [ ] 3.10 Create `server/src/routes/enrollmentRoutes.ts`
    - Mount at `/api/enrollment`
    - Wire all Study Center routes (protect + authorize `center_admin`)
    - Wire review routes (protect + authorize `ops_admin`, `ops_sub_admin`) with `checkDeptScope` middleware on approve/reject
    - _Requirements: 4.1–4.9, 5.1–5.7, 8.1–8.6_

  - [ ]* 3.11 Write property test for program visibility gate (P3)
    - **Property 3: Program visibility gate**
    - **Validates: Requirements 1.8, 2.1, 2.2, 2.3**
    - Generate programs with/without fee structures; assert GET /enrollment/programs returns exactly fee-configured ones

  - [ ]* 3.12 Write property test for filter correctness (P16)
    - **Property 16: Filter correctness**
    - **Validates: Requirements 8.5**
    - Query with random filter combinations (status, programId, date range); assert all results satisfy every applied filter

- [ ] 4. Register enrollment routes in server.ts
  - Import `enrollmentRoutes` from `./routes/enrollmentRoutes.js`
  - Add `app.use(\`/api/\${API_VERSION}/enrollment\`, enrollmentRoutes)` after existing route mounts
  - _Requirements: 4.1–4.9, 5.1–5.7_

- [ ] 5. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Finance Dashboard: add three new panels
  - [ ] 6.1 Create `ProgramFeeStructurePanel` component
    - File: `client/src/components/panels/ProgramFeeStructurePanel.tsx`
    - List all ProgramFeeStructures via `GET /finance/program-fees`; show program name, billingCycle, baseFee, additionalFees total
    - Form to create/edit: program picker, billingCycle select, baseFee input, dynamic additionalFees list (add/remove rows)
    - Delete with confirmation
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.8_

  - [ ] 6.2 Create `WalletTopUpsPanel` component
    - File: `client/src/components/panels/WalletTopUpsPanel.tsx`
    - List pending WalletTopUp requests via `GET /finance/wallet-topups`; show study center, amount, paymentMethod, referenceNumber, proofDocument link
    - Approve button → `PUT /finance/wallet-topups/:id/approve`
    - Reject button → modal with required remarks field → `PUT /finance/wallet-topups/:id/reject`
    - _Requirements: 3.6, 3.7, 3.8, 3.9_

  - [ ] 6.3 Create `FinanceEnrollmentsPanel` component
    - File: `client/src/components/panels/FinanceEnrollmentsPanel.tsx`
    - List enrollments in finance_review/enrolled/rejected via `GET /finance/enrollments`; show enrollmentNumber, studentName, program, studyCenter, status badge
    - Approve button (finance_review only) → `PUT /finance/enrollments/:id/approve`
    - Reject button (finance_review only) → modal with required remarks → `PUT /finance/enrollments/:id/reject`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 6.4 Add three new tabs to `ModernFinanceDashboard.tsx`
    - Import `ProgramFeeStructurePanel`, `WalletTopUpsPanel`, `FinanceEnrollmentsPanel`
    - Add `TabsTrigger` + `TabsContent` for `program-fees`, `wallet-topups`, `enrollments-finance`
    - Add tab values to `TABLE_TO_TAB` map in `App.tsx` if needed
    - _Requirements: 1.1–1.8, 3.6–3.9, 6.1–6.8_

- [ ] 7. Study Center Dashboard: new page and panels
  - [ ] 7.1 Create `StudyCenterWalletPanel` component
    - File: `client/src/components/panels/StudyCenterWalletPanel.tsx`
    - Show current balance via `GET /enrollment/wallet`
    - Top-up history list via `GET /enrollment/wallet/topups`; show amount, method, status badge, verifiedAt
    - Submit top-up form: amount input, paymentMethod select, conditional referenceNumber/proofDocument fields for offline
    - POST to `/enrollment/wallet/topup`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 7.2 Create `EnrollStudentPanel` component
    - File: `client/src/components/panels/EnrollStudentPanel.tsx`
    - Program picker: fetch from `GET /enrollment/programs`; show program name, fee breakdown (baseFee + additionalFees)
    - Student details form: name, email, phone, address
    - Show current wallet balance; warn if insufficient
    - Submit → `POST /enrollment/enroll`; show success with enrollmentNumber
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 4.8_

  - [ ] 7.3 Create `StudyCenterEnrollmentsPanel` component
    - File: `client/src/components/panels/StudyCenterEnrollmentsPanel.tsx`
    - List own enrollments via `GET /enrollment/enrollments`; show enrollmentNumber, studentName, program, status badge, createdAt
    - Status filter dropdown; expandable row showing statusHistory timeline
    - _Requirements: 8.1, 8.5_

  - [ ] 7.4 Create `StudyCenterDashboard` page
    - File: `client/src/pages/StudyCenterDashboard.tsx`
    - Tabs: `my-wallet` → `StudyCenterWalletPanel`, `enroll-student` → `EnrollStudentPanel`, `my-enrollments` → `StudyCenterEnrollmentsPanel`
    - Accept `initialTab?: string` prop
    - _Requirements: 3.1–3.9, 4.1–4.9, 8.1_

- [ ] 8. Operations Dashboard: add department enrollment review panel
  - [ ] 8.1 Create `DeptEnrollmentReviewPanel` component
    - File: `client/src/components/panels/DeptEnrollmentReviewPanel.tsx`
    - List document_review enrollments via `GET /enrollment/review`; show enrollmentNumber, studentName, program, studyCenter, createdAt
    - Approve button → `PUT /enrollment/review/:id/approve`
    - Reject button → modal with required remarks → `PUT /enrollment/review/:id/reject`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 8.2 Add `enrollment-review` tab to the Operations dashboard
    - Locate the Operations dashboard component (e.g. `ModernOperationsDashboard.tsx` or equivalent)
    - Import `DeptEnrollmentReviewPanel` and add `TabsTrigger` + `TabsContent` for `enrollment-review`
    - _Requirements: 5.1–5.7_

- [ ] 9. Wire Study Center Dashboard into App.tsx routing
  - Import `StudyCenterDashboard` page
  - Add `center_admin` to `getAvailableTables` sidebar entries: `my-wallet`, `enroll-student`, `my-enrollments`
  - Add entries to `TABLE_TO_TAB` map: `my_wallet → my-wallet`, `enroll_student → enroll-student`, `my_enrollments → my-enrollments`
  - In `Dashboard` component (or routing logic), render `StudyCenterDashboard` when `user.role === 'center_admin'`
  - _Requirements: 3.1–3.9, 4.1–4.9, 8.1_

- [ ] 10. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property-based tests use **fast-check** with a minimum of 100 iterations
- Each PBT task includes the tag comment `// Feature: student-enrollment-workflow, Property N: <property_text>` before the test definition
- Wallet debit + Enrollment creation must use a MongoDB session/transaction (Property 7 depends on this)
- `VALID_TRANSITIONS` constant exported from the Enrollment model is the single source of truth for all status machine checks
- The `checkDeptScope` middleware is reused by both approve and reject review routes
