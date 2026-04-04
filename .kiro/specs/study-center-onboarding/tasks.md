# Implementation Tasks

## Task 1: New Data Models

- [ ] 1.1 Create `server/src/models/StudyCenterInvite.ts` with token, universityIds, referredBy, branchId, status, expiresAt fields and indexes
- [ ] 1.2 Create `server/src/models/UniversityAuthFee.ts` with organizationId, universityId (unique per org), amount, currency, configuredBy fields
- [ ] 1.3 Create `server/src/models/ProgramAllocation.ts` with organizationId, studyCenterId, programId, allocatedBy, isActive fields and compound unique index
- [ ] 1.4 Extend `server/src/models/StudyCenter.ts`: add `associatedUniversityIds`, `pendingDocuments[]`, `statusHistory[]`, `verificationRemarks`, `paymentRemarks`, `verifiedBy`, `verifiedAt`, `financeApprovedBy`, `financeApprovedAt`, `inviteToken`; update status enum to include `pending_verification` and `pending_payment`
- [ ] 1.5 Export `VALID_ONBOARDING_TRANSITIONS` constant from `StudyCenter.ts`


## Task 2: Public Routes — Invite Validation and Registration

- [ ] 2.1 Create `server/src/controllers/publicController.ts` with `validateInviteToken` (GET) and `publicRegister` (POST with multipart upload)
- [ ] 2.2 `validateInviteToken`: find invite by token, return 404/410/409 for missing/expired/used; return invite + populated universities on success
- [ ] 2.3 `publicRegister`: validate required fields, check code uniqueness, create StudyCenter with `pending_verification`, mark token `used`, push first statusHistory entry, notify ops
- [ ] 2.4 Create `server/src/routes/publicRoutes.ts` with no-auth middleware for both endpoints
- [ ] 2.5 Register `/api/v1/public` in `server/src/server.ts`

## Task 3: Sales Controller — Invite Generation

- [ ] 3.1 Add `generateInvite` to `server/src/controllers/salesController.ts`: validate branch-scoped universities, create StudyCenterInvite, return invite URL
- [ ] 3.2 Add `listMyInvites` to `salesController.ts`: return invites where `referredBy === req.user._id`
- [ ] 3.3 Add routes `POST /sales/invites` and `GET /sales/invites` to `server/src/routes/salesRoutes.ts` (auth: `sales_admin`)

## Task 4: Operations Controller — Document Verification

- [ ] 4.1 Add `getPendingVerificationCenters` to `server/src/controllers/operationsController.ts`: filter by `status: pending_verification` and matching dept/sub-dept
- [ ] 4.2 Add `verifyCenter` to `operationsController.ts`: enforce `pending_verification` status, handle approve/reject, push statusHistory, notify finance or sales_admin
- [ ] 4.3 Add routes `GET /operations/centers/pending-verification` and `PUT /operations/centers/:id/verify` to `operationsRoutes.ts` (auth: `ops_admin`, `ops_sub_admin`)


## Task 5: Operations Controller — Program Allocation

- [ ] 5.1 Add `getProgramAllocations` to `operationsController.ts`: list allocations for a center
- [ ] 5.2 Add `allocateProgram` to `operationsController.ts`: verify center is active, check no duplicate active allocation, create ProgramAllocation
- [ ] 5.3 Add `removeAllocation` to `operationsController.ts`: soft-delete (set `isActive = false`)
- [ ] 5.4 Add routes `GET/POST /operations/centers/:id/allocations` and `DELETE /operations/centers/:id/allocations/:allocId` to `operationsRoutes.ts`

## Task 6: Finance Controller — Auth Fees and Payment Verification

- [ ] 6.1 Add `getAuthFees`, `createAuthFee`, `updateAuthFee` to `server/src/controllers/financeController.ts`
- [ ] 6.2 Add `getPendingPaymentCenters` to `financeController.ts`: filter by `status: pending_payment`, populate auth fee amounts per university
- [ ] 6.3 Add `financeVerifyCenter` to `financeController.ts`: enforce `pending_payment` status, check all universities have auth fees, handle approve (generate credentials, send email) / reject, push statusHistory
- [ ] 6.4 Add routes `GET/POST /finance/auth-fees`, `PUT /finance/auth-fees/:id`, `GET /finance/centers/pending-payment`, `PUT /finance/centers/:id/finance-verify` to `financeRoutes.ts`

## Task 7: Enrollment Scope Enforcement

- [ ] 7.1 In the enrollment creation handler (student enrollment workflow), add a check that a `ProgramAllocation` with `isActive: true` exists for `(studyCenterId, programId)` before allowing enrollment
- [ ] 7.2 In the programs listing endpoint for study centers, filter to only return programs with an active `ProgramAllocation` for that center

## Task 8: Frontend — Sales Invite Panel

- [ ] 8.1 Create `client/src/components/panels/SalesInvitePanel.tsx`: table of own invites (status badge, expiry, copy-link button), "Generate Invite" dialog with branch-scoped university multi-select
- [ ] 8.2 Add "Invite Links" tab to the Sales dashboard

## Task 9: Frontend — Public Registration Page

- [ ] 9.1 Create `client/src/pages/PublicRegisterPage.tsx`: no-auth page, validate token on mount, render form with center fields + university checkboxes + document uploads
- [ ] 9.2 Add route `/register` in `client/src/App.tsx` pointing to `PublicRegisterPage` (outside auth guard)

## Task 10: Frontend — Ops Verification and Allocation Panels

- [ ] 10.1 Create `client/src/components/panels/OpsCenterVerificationPanel.tsx`: list pending_verification centers, document preview, approve/reject with remarks dialog
- [ ] 10.2 Create `client/src/components/panels/OpsProgramAllocationPanel.tsx`: select center → list allocations → add/remove programs
- [ ] 10.3 Add "Pending Verification" and "Program Allocations" tabs to the Ops dashboard

## Task 11: Frontend — Finance Auth Fee and Payment Verification Panels

- [ ] 11.1 Create `client/src/components/panels/FinanceAuthFeePanel.tsx`: table of UniversityAuthFee records, create/edit dialog
- [ ] 11.2 Create `client/src/components/panels/FinanceCenterVerificationPanel.tsx`: list pending_payment centers with auth fee amounts, approve/reject with remarks dialog
- [ ] 11.3 Add "Auth Fees" and "Pending Payment" tabs to `ModernFinanceDashboard.tsx`

## Task 12: Scheduled Token Expiry Job

- [ ] 12.1 Add a cron job in `server/src/services/cronService.ts` that runs daily and sets `status = 'expired'` on all `StudyCenterInvite` records where `expiresAt < now` and `status === 'pending'`
