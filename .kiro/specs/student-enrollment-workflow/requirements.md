# Requirements Document

## Introduction

The Student Enrollment Workflow feature enables a structured, multi-stage process for enrolling students into academic programs. Finance configures a `ProgramFeeStructure` per program (per semester, per year, or total), including additional named fees. Once a fee structure is configured, the program becomes visible to departments and study centers for enrollment. A study center must first top up its wallet (via payment gateway or offline bank transfer, subject to finance verification) before paying enrollment fees from that wallet. After payment, the assigned department or sub-department manager verifies documents and approves or rejects. Finally, finance performs payment confirmation and grants official enrollment status.

## Glossary

- **System**: The student enrollment workflow application
- **Finance_Admin**: A user with the `finance_admin` role responsible for configuring fee structures, verifying wallet top-ups, and performing final enrollment verification
- **Study_Center**: An approved partner center that enrolls students and pays enrollment fees from its wallet
- **Dept_Manager**: A user with the `dept_manager` role assigned to a regular department, responsible for document verification and approval/rejection of enrollments for programs under that department
- **Sub_Dept_Manager**: A user with the `sub_dept_manager` role assigned to a sub-department, responsible for document verification and approval/rejection of enrollments for programs under that sub-department
- **Department**: A regular department or sub-department assigned to a program, whose manager is responsible for document verification
- **Enrollment**: A record representing a student's application to join a specific program, progressing through workflow stages
- **ProgramFeeStructure**: The payment configuration for a program, including billing cycle, base fee, and optional additional named fees. This is a new model distinct from the existing FeeStructure model
- **Additional_Fee**: A named, optional charge attached to a ProgramFeeStructure with a label and non-negative amount (e.g., exam fee, registration fee)
- **Enrollment_Status**: The current stage of an enrollment record — one of `payment_pending`, `document_review`, `department_approved`, `department_rejected`, `finance_review`, `enrolled`, `rejected`
- **Program**: An academic program with an assigned university, organization, and optionally a sub-department
- **StudyCenter_Wallet**: A wallet balance associated with a Study_Center, used to pay enrollment fees
- **WalletTopUp**: A request submitted by a Study_Center to add funds to its wallet, requiring Finance_Admin verification before the balance is credited
- **EnrollmentPayment**: A new model that records the wallet debit for a specific enrollment, distinct from the existing PaymentEntry model

---

## Requirements

### Requirement 1: ProgramFeeStructure Configuration

**User Story:** As a Finance_Admin, I want to configure a ProgramFeeStructure for a program, so that study centers and students know the exact fees before enrollment begins.

#### Acceptance Criteria

1. WHEN a Finance_Admin creates a ProgramFeeStructure for a program, THE System SHALL accept a billing cycle of `per_semester`, `per_year`, or `total`.
2. WHEN a Finance_Admin creates a ProgramFeeStructure for a program, THE System SHALL accept a base fee amount corresponding to the selected billing cycle.
3. THE System SHALL allow a Finance_Admin to attach zero or more Additional_Fees to a ProgramFeeStructure, each with a unique label and a non-negative amount.
4. WHEN a Finance_Admin submits a ProgramFeeStructure with a missing or empty billing cycle, THE System SHALL return a validation error identifying the missing field.
5. WHEN a Finance_Admin submits a ProgramFeeStructure with a negative base fee amount, THE System SHALL return a validation error.
6. WHEN a Finance_Admin submits an Additional_Fee with an empty label, THE System SHALL return a validation error.
7. THE System SHALL allow a Finance_Admin to update an existing ProgramFeeStructure, including changing the billing cycle, base fee, and Additional_Fees list.
8. WHEN a ProgramFeeStructure is saved for a program, THE System SHALL mark that program as fee-configured so it becomes visible to departments and study centers for enrollment.

### Requirement 2: Program Visibility After Fee Configuration

**User Story:** As a Dept_Manager, Sub_Dept_Manager, or Study_Center operator, I want to see only programs that have a configured ProgramFeeStructure, so that I can enroll students into programs that are ready for enrollment.

#### Acceptance Criteria

1. WHEN a department manager or study center queries available programs, THE System SHALL return only programs that have an associated ProgramFeeStructure.
2. WHILE a program has no associated ProgramFeeStructure, THE System SHALL exclude that program from enrollment-eligible program listings.
3. WHEN a ProgramFeeStructure is deleted for a program, THE System SHALL remove that program from enrollment-eligible program listings.

### Requirement 3: Study Center Wallet Top-Up

**User Story:** As a Study_Center operator, I want to top up my wallet before paying enrollment fees, so that I have sufficient balance to initiate student enrollments.

#### Acceptance Criteria

1. WHEN a Study_Center operator submits a WalletTopUp request, THE System SHALL accept an amount greater than zero and a payment method of either `payment_gateway` or `offline`.
2. WHEN a Study_Center operator submits a WalletTopUp request with payment method `offline`, THE System SHALL require a bank transfer proof document or reference number.
3. WHEN a Study_Center operator submits a WalletTopUp request with a missing or zero amount, THE System SHALL return a validation error.
4. WHEN a Study_Center operator submits a WalletTopUp request with payment method `offline` and no proof or reference, THE System SHALL return a validation error.
5. WHEN a WalletTopUp request is submitted, THE System SHALL create the request with status `pending` and SHALL NOT credit the wallet balance until Finance_Admin verification is complete.
6. WHEN a Finance_Admin approves a WalletTopUp request, THE System SHALL credit the requested amount to the Study_Center's wallet balance and transition the request status to `approved`.
7. WHEN a Finance_Admin rejects a WalletTopUp request, THE System SHALL require a non-empty remarks field, leave the wallet balance unchanged, and transition the request status to `rejected`.
8. IF a Finance_Admin attempts to approve or reject a WalletTopUp request not in `pending` status, THEN THE System SHALL return an error indicating the action is not permitted.
9. THE System SHALL record the Finance_Admin user ID and timestamp on the WalletTopUp request when a decision is made.

### Requirement 4: Study Center Initiates Enrollment via Wallet Payment

**User Story:** As a Study_Center operator, I want to enroll a student into a program by paying the enrollment fee from my wallet, so that the enrollment process can begin.

#### Acceptance Criteria

1. WHEN a Study_Center operator submits an enrollment request for a student and program, THE System SHALL verify that the Study_Center's wallet balance is greater than or equal to the total enrollment fee defined in the ProgramFeeStructure.
2. IF a Study_Center operator submits an enrollment request and the wallet balance is insufficient, THEN THE System SHALL return an error indicating insufficient wallet balance and SHALL NOT create the Enrollment record.
3. WHEN a Study_Center operator submits a valid enrollment request with sufficient wallet balance, THE System SHALL atomically debit the enrollment fee from the wallet and create an Enrollment record with status `payment_pending`.
4. WHEN an Enrollment is created, THE System SHALL create an EnrollmentPayment record linked to that Enrollment, recording the amount debited, the Study_Center wallet ID, and the timestamp of the debit.
5. WHEN an Enrollment is created with wallet payment, THE System SHALL transition the Enrollment status from `payment_pending` to `document_review` immediately after the wallet debit is confirmed.
6. THE System SHALL require the following fields when creating an Enrollment: student name, email, phone, address, program ID, and study center ID.
7. THE System SHALL generate a unique enrollment number for each Enrollment at creation time.
8. IF a Study_Center operator submits an enrollment request for a program with no ProgramFeeStructure, THEN THE System SHALL return an error indicating the program is not yet open for enrollment.
9. IF the wallet debit and enrollment creation cannot be completed atomically, THEN THE System SHALL roll back both operations and return an error.

### Requirement 5: Department Document Verification

**User Story:** As a Dept_Manager or Sub_Dept_Manager, I want to review a student's documents and approve or reject the enrollment, so that only qualified students proceed to finance verification.

#### Acceptance Criteria

1. WHEN an Enrollment reaches `document_review` status, THE System SHALL make it visible to the Dept_Manager of the department assigned to the program, or the Sub_Dept_Manager of the sub-department assigned to the program.
2. WHEN a Dept_Manager or Sub_Dept_Manager approves an Enrollment in `document_review` status, THE System SHALL transition the Enrollment status to `finance_review`.
3. WHEN a Dept_Manager or Sub_Dept_Manager rejects an Enrollment in `document_review` status, THE System SHALL require a non-empty remarks field and transition the Enrollment status to `department_rejected`.
4. IF a Dept_Manager or Sub_Dept_Manager attempts to approve or reject an Enrollment not in `document_review` status, THEN THE System SHALL return an error indicating the action is not permitted at the current stage.
5. THE System SHALL record the approving or rejecting user ID and timestamp on the Enrollment when a department decision is made.
6. WHEN an Enrollment is rejected by a Dept_Manager or Sub_Dept_Manager, THE System SHALL preserve the rejection remarks on the Enrollment record.
7. IF a user with neither `dept_manager` nor `sub_dept_manager` role attempts to perform document verification, THEN THE System SHALL return a 403 Forbidden response.

### Requirement 6: Finance Final Verification

**User Story:** As a Finance_Admin, I want to verify payment and approve or reject the enrollment at the final stage, so that only students with confirmed payment are officially enrolled.

#### Acceptance Criteria

1. WHEN an Enrollment reaches `finance_review` status, THE System SHALL make it visible to Finance_Admin users.
2. WHEN a Finance_Admin approves an Enrollment in `finance_review` status, THE System SHALL verify that an EnrollmentPayment record exists for that Enrollment before granting approval.
3. IF a Finance_Admin attempts to approve an Enrollment with no associated EnrollmentPayment record, THEN THE System SHALL return an error indicating payment has not been recorded.
4. WHEN a Finance_Admin approves an Enrollment in `finance_review` status, THE System SHALL transition the Enrollment status to `enrolled` and set the student's official enrollment date.
5. WHEN a Finance_Admin approves an Enrollment, THE System SHALL update the linked Student record status to `active`.
6. WHEN a Finance_Admin rejects an Enrollment in `finance_review` status, THE System SHALL require a non-empty remarks field and transition the Enrollment status to `rejected`.
7. IF a Finance_Admin attempts to approve or reject an Enrollment not in `finance_review` status, THEN THE System SHALL return an error indicating the action is not permitted at the current stage.
8. THE System SHALL record the Finance_Admin user ID and timestamp on the Enrollment when a finance decision is made.

### Requirement 7: Enrollment Status State Machine and Audit History

**User Story:** As a system operator, I want enrollment status to follow a strict, auditable progression, so that no stage can be skipped and the workflow remains consistent.

#### Acceptance Criteria

1. THE System SHALL enforce the following valid status transitions for an Enrollment:
   - `payment_pending` → `document_review` (on wallet debit confirmed)
   - `document_review` → `finance_review` (on Dept_Manager or Sub_Dept_Manager approval)
   - `document_review` → `department_rejected` (on Dept_Manager or Sub_Dept_Manager rejection)
   - `finance_review` → `enrolled` (on Finance_Admin approval)
   - `finance_review` → `rejected` (on Finance_Admin rejection)
2. IF a status transition is attempted that is not in the valid set, THEN THE System SHALL return an error and leave the Enrollment status unchanged.
3. THE System SHALL record a status history entry on the Enrollment each time the status changes, including the new status, actor user ID, and timestamp.
4. THE System SHALL preserve all status history entries and SHALL NOT allow deletion or modification of existing history entries.

### Requirement 8: Role-Scoped Enrollment Querying

**User Story:** As any authorized user, I want to query enrollments filtered by status and role scope, so that each actor sees only the enrollments relevant to their responsibilities.

#### Acceptance Criteria

1. WHEN a Study_Center operator queries enrollments, THE System SHALL return only enrollments belonging to that study center.
2. WHEN a Dept_Manager queries enrollments, THE System SHALL return only enrollments in `document_review` status for programs assigned to that department.
3. WHEN a Sub_Dept_Manager queries enrollments, THE System SHALL return only enrollments in `document_review` status for programs assigned to that sub-department.
4. WHEN a Finance_Admin queries enrollments, THE System SHALL return enrollments in `finance_review`, `enrolled`, and `rejected` statuses scoped to the organization.
5. THE System SHALL support filtering enrollments by status, program ID, and date range.
6. WHEN an unauthorized user attempts to access enrollment records outside their scope, THE System SHALL return a 403 Forbidden response.
