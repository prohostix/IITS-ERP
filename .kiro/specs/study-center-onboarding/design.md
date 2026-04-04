# Design Document

## Introduction

This document describes the technical design for the Study Center Onboarding feature. It covers new data models, API routes, frontend panels, and correctness properties that must hold throughout the system.

---

## Architecture Overview

The onboarding flow is a multi-stage pipeline:

```
Sales_Admin generates invite
        ↓
Prospective operator opens public link → submits registration form
        ↓
Study_Center created (status: pending_verification)
        ↓
Ops_Admin / Ops_Sub_Admin reviews documents → approve / reject
        ↓
Study_Center (status: pending_payment)
        ↓
Finance_Admin verifies authorisation fee → approve / reject
        ↓
Study_Center (status: active) → credentials generated + emailed
        ↓
Ops_Admin allocates programs → center can enroll students
```

---

## Data Models

### 1. `StudyCenterInvite` (new)

```typescript
{
  organizationId: ObjectId          // scoped to org
  token: string                     // crypto.randomBytes(32).toString('hex')
  universityIds: ObjectId[]         // ≥1 university from branch-allowed list
  referredBy: ObjectId              // sales_admin user ID
  branchId: ObjectId                // sales_admin's branchId at creation time
  status: 'pending' | 'used' | 'expired'
  expiresAt: Date                   // createdAt + 7 days
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}
// Indexes: { token: 1 } unique, { organizationId: 1, referredBy: 1 }, { expiresAt: 1 } (TTL marker)
```

### 2. `UniversityAuthFee` (new)

```typescript
{
  organizationId: ObjectId
  universityId: ObjectId            // unique per org
  amount: number                    // > 0
  currency: string                  // default 'INR'
  configuredBy: ObjectId            // finance_admin user ID
  updatedAt: Date
  createdAt: Date
}
// Indexes: { organizationId: 1, universityId: 1 } unique
```

### 3. `ProgramAllocation` (new)

```typescript
{
  organizationId: ObjectId
  studyCenterId: ObjectId
  programId: ObjectId
  allocatedBy: ObjectId             // ops_admin / ops_sub_admin user ID
  allocatedAt: Date
  isActive: boolean                 // soft-delete; false = removed
  createdAt: Date
  updatedAt: Date
}
// Indexes: { organizationId: 1, studyCenterId: 1, programId: 1 } unique
```

### 4. `StudyCenter` (extend existing model)

Add the following fields to the existing `StudyCenter` schema:

```typescript
// New fields
associatedUniversityIds: ObjectId[]   // universities selected at registration
pendingDocuments: [{
  name: string
  url: string
  uploadedAt: Date
}]
statusHistory: [{
  status: string
  actorId: ObjectId
  remarks?: string
  timestamp: Date
}]
verificationRemarks?: string          // ops decision remarks
paymentRemarks?: string               // finance decision remarks
verifiedBy?: ObjectId                 // ops_admin / ops_sub_admin who approved docs
verifiedAt?: Date
financeApprovedBy?: ObjectId          // finance_admin who approved payment
financeApprovedAt?: Date
inviteToken?: string                  // token used to register
referredBy?: ObjectId                 // already exists — keep
```

Update `status` enum to:
`'pending_verification' | 'pending_payment' | 'active' | 'rejected' | 'suspended'`

(Keep `'pending'` as alias during migration; new records use `pending_verification`.)

### 5. `User` (no schema change needed)

`sales_admin` users already have `branchId`. `ops_admin` / `ops_sub_admin` already have `departmentId` / `subDepartmentId`. No new fields required.

---

## Valid Status Transitions

```typescript
export const VALID_ONBOARDING_TRANSITIONS: Record<string, string[]> = {
  pending_verification: ['pending_payment', 'rejected'],
  pending_payment:      ['active', 'rejected'],
  active:               ['suspended'],
  suspended:            ['active'],
  rejected:             [],
};
```

---

## API Routes

All routes are prefixed with `/api/v1`.

### Sales Routes (`/sales`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sales/invites` | `sales_admin` | Generate invite link |
| GET | `/sales/invites` | `sales_admin` | List own invites |
| GET | `/sales/invites/:token/validate` | public | Validate token (no auth) |

### Operations Routes (`/operations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/operations/centers/pending-verification` | `ops_admin`, `ops_sub_admin` | List centers pending doc review |
| PUT | `/operations/centers/:id/verify` | `ops_admin`, `ops_sub_admin` | Approve or reject docs |
| GET | `/operations/centers/:id/allocations` | `ops_admin`, `ops_sub_admin` | List program allocations for a center |
| POST | `/operations/centers/:id/allocations` | `ops_admin`, `ops_sub_admin` | Allocate a program |
| DELETE | `/operations/centers/:id/allocations/:allocId` | `ops_admin`, `ops_sub_admin` | Remove allocation |

### Finance Routes (`/finance`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/finance/auth-fees` | `finance_admin` | List all UniversityAuthFee records |
| POST | `/finance/auth-fees` | `finance_admin` | Create UniversityAuthFee |
| PUT | `/finance/auth-fees/:id` | `finance_admin` | Update UniversityAuthFee |
| GET | `/finance/centers/pending-payment` | `finance_admin` | List centers pending payment verification |
| PUT | `/finance/centers/:id/finance-verify` | `finance_admin` | Approve or reject payment |

### Public Routes (`/public`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/invite/:token` | none | Validate token + return universities |
| POST | `/public/register` | none | Submit registration form (multipart) |

---

## Controller Logic

### `generateInvite` (sales)
1. Verify `req.user.branchId` exists.
2. Validate each `universityId` in body is in `university.allowedBranchIds` for this user's branch.
3. Create `StudyCenterInvite` with `expiresAt = now + 7 days`, `status = 'pending'`.
4. Return `{ inviteUrl: \`${CLIENT_URL}/register?token=${token}\` }`.

### `validateToken` (public)
1. Find invite by token.
2. If not found → 404.
3. If `status === 'expired'` or `expiresAt < now` → 410 Gone.
4. If `status === 'used'` → 409 Conflict.
5. Return invite with populated `universityIds`.

### `publicRegister` (public)
1. Validate token (same checks as above).
2. Validate required fields: `name`, `code`, `address`, `contact`, `email`, `universityIds` (subset of invite's universities), at least one document.
3. Check `code` uniqueness within `organizationId`.
4. Create `StudyCenter` with `status: 'pending_verification'`, `associatedUniversityIds`, `pendingDocuments`, `referredBy = invite.referredBy`, `inviteToken = token`.
5. Push first `statusHistory` entry.
6. Mark invite `status = 'used'`, `usedAt = now`.
7. Notify responsible ops user(s) via notification system.

### `verifyCenter` (ops)
1. Load center; check `status === 'pending_verification'`.
2. If `action === 'approve'`: transition to `pending_payment`, set `verifiedBy`, `verifiedAt`, push history.
3. If `action === 'reject'`: require `remarks`, transition to `rejected`, push history.
4. Notify finance (on approve) or sales_admin (on reject).

### `financeVerifyCenter` (finance)
1. Load center; check `status === 'pending_payment'`.
2. If `action === 'approve'`:
   - Check each associated university has a `UniversityAuthFee` configured.
   - Transition to `active`, set `financeApprovedBy`, `financeApprovedAt`.
   - Generate credentials: `username = center.code.toLowerCase()`, `password = crypto.randomBytes(8).toString('hex')`.
   - Store hashed password on record; send plain credentials to `center.email`.
   - Push history.
3. If `action === 'reject'`: require `remarks`, transition to `rejected`, push history.

### `allocateProgram` (ops)
1. Verify center `status === 'active'`.
2. Check no existing active `ProgramAllocation` for same `(studyCenterId, programId)`.
3. Create allocation.

### `removeAllocation` (ops)
1. Set `isActive = false` on allocation (soft delete).
2. Does not affect existing enrollments.

---

## Frontend Panels

### 1. `SalesInvitePanel.tsx`
- Tab in Sales dashboard: "Invite Links"
- Table of own invites: token (masked), universities, status badge, expiry, copy-link button
- "Generate Invite" dialog: multi-select universities (branch-scoped), submit → copy link

### 2. `PublicRegisterPage.tsx` (new route `/register`)
- No auth required
- On mount: call `GET /public/invite/:token` — show error if invalid/expired/used
- Form: center name, code, address, contact, email, university checkboxes (from invite), document uploads
- On submit: `POST /public/register` with `multipart/form-data`
- Success: show "Application submitted" screen

### 3. `OpsCenterVerificationPanel.tsx`
- Tab in Ops dashboard: "Pending Verification"
- List of `pending_verification` centers with documents preview
- Approve / Reject buttons with remarks dialog

### 4. `FinanceAuthFeePanel.tsx`
- Tab in Finance dashboard: "Auth Fees"
- Table of `UniversityAuthFee` records; create/edit dialog

### 5. `FinanceCenterVerificationPanel.tsx`
- Tab in Finance dashboard: "Pending Payment"
- List of `pending_payment` centers with auth fee amounts shown
- Approve / Reject buttons with remarks dialog

### 6. `OpsProgramAllocationPanel.tsx`
- Tab in Ops dashboard: "Program Allocations"
- Select a center → list allocated programs → add/remove

---

## Correctness Properties

1. **Invite uniqueness**: Every `StudyCenterInvite` token is globally unique.
2. **Invite expiry enforcement**: A token past its `expiresAt` cannot be used to register.
3. **Single-use token**: A `used` token cannot produce a second `StudyCenter`.
4. **Branch-scoped university selection**: An invite can only reference universities where the creator's `branchId` is in `allowedBranchIds`.
5. **Required fields on registration**: A `StudyCenter` cannot be created without `name`, `code`, `address`, `contact`, `email`, and at least one document.
6. **Code uniqueness per org**: No two `StudyCenter` records in the same `organizationId` share the same `code`.
7. **Valid initial status**: Every `StudyCenter` created via public registration starts with `status = 'pending_verification'`.
8. **Status transition safety**: The system only allows transitions defined in `VALID_ONBOARDING_TRANSITIONS`; all other transitions are rejected.
9. **Ops approval requires pending_verification**: `verifyCenter` only succeeds when `status === 'pending_verification'`.
10. **Finance approval requires pending_payment**: `financeVerifyCenter` only succeeds when `status === 'pending_payment'`.
11. **Rejection requires remarks**: Any rejection action (ops or finance) must include a non-empty `remarks` string.
12. **Auth fee required before activation**: Finance cannot approve a center if any associated university lacks a `UniversityAuthFee`.
13. **Credentials generated on activation**: Every `active` `StudyCenter` has non-null `credentials.username` and `credentials.password`.
14. **Status history append-only**: `statusHistory` entries are never deleted or modified after creation.
15. **Allocation uniqueness**: No two active `ProgramAllocation` records exist for the same `(studyCenterId, programId)` pair.
16. **Enrollment scope**: A study center can only enroll students into programs with an active `ProgramAllocation` for that center.
