import re

with open("server/prisma/schema.prisma", "r") as f:
    content = f.read()

# Add to LeaveType Enum
if "compensatory" not in content:
    content = re.sub(r'enum LeaveType \{([^}]*)\}', r'enum LeaveType {\1  compensatory\n  bereavement\n  half_day\n}', content)

# Add new Enums
if "enum EmploymentRole" not in content:
    new_enums = """
enum EmploymentRole {
  intern
  probation
  permanent
}

enum InductionStatus {
  pending
  completed
}

enum HiringStatus {
  pending_hr_approval
  approved
  offer_sent
  joined
  appointment_sent
  induction_pending
  induction_completed
  rejected
}
"""
    content += new_enums

# Add new Models
if "model HiringRequest" not in content:
    new_models = """
model HiringRequest {
  id             String       @id @default(uuid())
  organizationId String
  departmentId   String
  designationId  String?
  title          String
  description    String?
  count          Int
  requestedBy    String       
  status         HiringStatus @default(pending_hr_approval)
  hrApprovedBy   String?
  hrRemarks      String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  department     Department   @relation(fields: [departmentId], references: [id])
  requester      User         @relation("HiringRequestedBy", fields: [requestedBy], references: [id])
  hrApprover     User?        @relation("HiringApprovedBy", fields: [hrApprovedBy], references: [id])
  candidates     Candidate[]
}

model Candidate {
  id                   String       @id @default(uuid())
  organizationId       String
  hiringRequestId      String
  name                 String
  email                String
  phone                String
  status               HiringStatus @default(offer_sent)
  offerLetterUrl       String?
  appointmentLetterUrl String?
  joinDate             DateTime?
  employeeId           String?      @unique
  employmentRole       EmploymentRole @default(probation)
  inductionStatus      InductionStatus @default(pending)
  inductionCompletedBy String?
  inductionCompletedAt DateTime?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  
  hiringRequest        HiringRequest @relation(fields: [hiringRequestId], references: [id])
  organization         Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  inductor             User?         @relation("InductionCompletedBy", fields: [inductionCompletedBy], references: [id])
}

model Shift {
  id               String       @id @default(uuid())
  organizationId   String
  name             String
  startTime        String?      // "09:00" format
  endTime          String?      // "18:00" format
  isOpenShift      Boolean      @default(false)
  graceTimeMinutes Int          @default(15)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  employees        EmployeeProfile[]
}
"""
    content += new_models

# Update EmployeeProfile
if "employmentRole" not in content:
    # We replace 'ctc                Float?' with new fields
    content = re.sub(
        r'ctc\s+Float\?',
        r'shiftId            String?\n  employmentRole     EmploymentRole @default(permanent)\n  inductionStatus    InductionStatus @default(completed)\n  inductionCompletedBy String?',
        content
    )
    # Add relation to Candidate and Shift and Inductor
    content = re.sub(
        r'user               User         @relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)',
        r'user               User         @relation(fields: [userId], references: [id], onDelete: Cascade)\n  shift              Shift?       @relation(fields: [shiftId], references: [id])',
        content
    )

# Update Attendance
if "isHalfDay" not in content:
    content = re.sub(
        r'workingHours     Float            @default\(0\)',
        r'workingHours     Float            @default(0)\n  isHalfDay        Boolean          @default(false)\n  isWFH            Boolean          @default(false)\n  lateDeductionAmount Float?        @default(0)',
        content
    )

# Update LeaveRequest
if "isHalfDay" not in content:
    content = re.sub(
        r'reason           String',
        r'reason           String\n  isHalfDay        Boolean      @default(false)\n  attachmentUrl    String?',
        content
    )

# Update SalaryConfig
if "professionalTax" not in content:
    content = re.sub(
        r'basicSalary            Float',
        r'basicSalary            Float\n  professionalTax        Float          @default(0)\n  labourWelfareFund      Float          @default(0)\n  tds                    Float          @default(0)',
        content
    )

# Update HRSettings
if "lateDeductionRules" not in content:
    content = re.sub(
        r'latePolicy                Json',
        r'latePolicy                Json\n  lateDeductionRules        Json         @default("[]")\n  leaveCarryForwardRules    Json         @default("[]")',
        content
    )

# Update User relations for new fields (HiringRequestedBy, HiringApprovedBy, InductionCompletedBy)
if "HiringRequestedBy" not in content:
    content = re.sub(
        r'assistantManagedDepartments   Department\[\]          @relation\("AssistantManagers"\)',
        r'assistantManagedDepartments   Department[]          @relation("AssistantManagers")\n  requestedHirings            HiringRequest[]       @relation("HiringRequestedBy")\n  approvedHirings             HiringRequest[]       @relation("HiringApprovedBy")\n  inductionsCompleted         Candidate[]           @relation("InductionCompletedBy")',
        content
    )

with open("server/prisma/schema.prisma", "w") as f:
    f.write(content)
print("Schema patched.")
