
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  logo: 'logo',
  address: 'address',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  status: 'status',
  plan: 'plan',
  licenseId: 'licenseId',
  licenseExpiry: 'licenseExpiry',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  contactName: 'contactName'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  organizationId: 'organizationId',
  departmentId: 'departmentId',
  additionalDepartmentIds: 'additionalDepartmentIds',
  branchId: 'branchId',
  subDepartmentId: 'subDepartmentId',
  ceoPanelId: 'ceoPanelId',
  studyCenterId: 'studyCenterId',
  email: 'email',
  password: 'password',
  name: 'name',
  role: 'role',
  avatar: 'avatar',
  phone: 'phone',
  designation: 'designation',
  reportingTo: 'reportingTo',
  status: 'status',
  lastLogin: 'lastLogin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  designationId: 'designationId'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  type: 'type',
  subType: 'subType',
  parentDepartmentId: 'parentDepartmentId',
  managerId: 'managerId',
  assistantManagerIds: 'assistantManagerIds',
  features: 'features',
  permissions: 'permissions',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubDepartmentScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  parentDeptId: 'parentDeptId',
  managerId: 'managerId',
  features: 'features',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BranchScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  code: 'code',
  address: 'address',
  city: 'city',
  state: 'state',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  operationsDeptId: 'operationsDeptId',
  salesDeptId: 'salesDeptId',
  branchManagerId: 'branchManagerId'
};

exports.Prisma.StudyCenterScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  code: 'code',
  address: 'address',
  city: 'city',
  state: 'state',
  contactPerson: 'contactPerson',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  status: 'status',
  assignedUniversities: 'assignedUniversities',
  assignedPrograms: 'assignedPrograms',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  financeApprovedAt: 'financeApprovedAt',
  financeApprovedBy: 'financeApprovedBy',
  opsRemarks: 'opsRemarks',
  paymentProof: 'paymentProof',
  paymentRemarks: 'paymentRemarks',
  referredById: 'referredById',
  verifiedAt: 'verifiedAt',
  verifiedBy: 'verifiedBy'
};

exports.Prisma.UniversityScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  subDepartmentId: 'subDepartmentId',
  name: 'name',
  code: 'code',
  address: 'address',
  contact: 'contact',
  status: 'status',
  allowedBranchIds: 'allowedBranchIds',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProgramScalarFieldEnum = {
  id: 'id',
  universityId: 'universityId',
  organizationId: 'organizationId',
  subDepartmentId: 'subDepartmentId',
  name: 'name',
  code: 'code',
  courseType: 'courseType',
  duration: 'duration',
  hasSemesters: 'hasSemesters',
  semesters: 'semesters',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LicenseScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  features: 'features',
  maxUsers: 'maxUsers',
  maxStorage: 'maxStorage',
  durationMonths: 'durationMonths',
  price: 'price',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRSettingsScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  officeHours: 'officeHours',
  latePolicy: 'latePolicy',
  location: 'location',
  locations: 'locations',
  requireLocationForCheckIn: 'requireLocationForCheckIn',
  biometric: 'biometric',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeStructureScalarFieldEnum = {
  id: 'id',
  programId: 'programId',
  organizationId: 'organizationId',
  registrationFee: 'registrationFee',
  tuitionFee: 'tuitionFee',
  examFee: 'examFee',
  otherCharges: 'otherCharges',
  gstPercentage: 'gstPercentage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalaryConfigScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  basicSalary: 'basicSalary',
  allowances: 'allowances',
  deductions: 'deductions',
  lateDeductionPerMinute: 'lateDeductionPerMinute',
  effectiveFrom: 'effectiveFrom',
  createdBy: 'createdBy',
  approvalStatus: 'approvalStatus',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  rejectedRemarks: 'rejectedRemarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'dueDate',
  creatorId: 'creatorId',
  assigneeId: 'assigneeId',
  orgId: 'orgId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  completedAt: 'completedAt',
  departmentId: 'departmentId',
  escalatedAt: 'escalatedAt',
  escalatedToId: 'escalatedToId',
  escalationStatus: 'escalationStatus',
  evidence: 'evidence',
  gracePeriodEnd: 'gracePeriodEnd',
  remarks: 'remarks'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  date: 'date',
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  status: 'status',
  orgId: 'orgId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  status: 'status',
  orgId: 'orgId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  approvedBy: 'approvedBy',
  statusRemarks: 'statusRemarks'
};

exports.Prisma.EnrollmentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  universityId: 'universityId',
  programId: 'programId',
  studyCenterId: 'studyCenterId',
  status: 'status',
  orgId: 'orgId',
  admissionSessionId: 'admissionSessionId',
  enrolledBy: 'enrolledBy',
  enrolledAt: 'enrolledAt',
  transferredToFinance: 'transferredToFinance',
  transferredToFinanceAt: 'transferredToFinanceAt',
  financeApprovedBy: 'financeApprovedBy',
  financeApprovedAt: 'financeApprovedAt',
  paymentDate: 'paymentDate',
  paymentMethod: 'paymentMethod',
  paymentReference: 'paymentReference',
  processedBy: 'processedBy',
  processedAt: 'processedAt',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deptRemarks: 'deptRemarks',
  deptReviewedAt: 'deptReviewedAt',
  deptReviewedBy: 'deptReviewedBy',
  enrollmentNumber: 'enrollmentNumber',
  financeRemarks: 'financeRemarks',
  financeReviewedAt: 'financeReviewedAt',
  financeReviewedBy: 'financeReviewedBy'
};

exports.Prisma.StudentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  orgId: 'orgId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  status: 'status'
};

exports.Prisma.EnrollmentPaymentScalarFieldEnum = {
  id: 'id',
  enrollmentId: 'enrollmentId',
  amount: 'amount',
  type: 'type',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  month: 'month',
  year: 'year',
  basicSalary: 'basicSalary',
  allowances: 'allowances',
  deductions: 'deductions',
  netSalary: 'netSalary',
  status: 'status',
  orgId: 'orgId',
  transferredToFinance: 'transferredToFinance',
  transferredToFinanceAt: 'transferredToFinanceAt',
  financeApprovedBy: 'financeApprovedBy',
  financeApprovedAt: 'financeApprovedAt',
  paymentDate: 'paymentDate',
  paymentMethod: 'paymentMethod',
  paymentReference: 'paymentReference',
  processedBy: 'processedBy',
  processedAt: 'processedAt',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudyCenterWalletScalarFieldEnum = {
  id: 'id',
  centerId: 'centerId',
  balance: 'balance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReferralLinkScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  employeeName: 'employeeName',
  slug: 'slug',
  fullUrl: 'fullUrl',
  status: 'status',
  metrics: 'metrics',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionSessionScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  subDepartmentId: 'subDepartmentId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  examDate: 'examDate',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InternalMarkScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  studentId: 'studentId',
  subjectId: 'subjectId',
  subjectName: 'subjectName',
  marks: 'marks',
  maxMarks: 'maxMarks',
  examType: 'examType',
  enteredBy: 'enteredBy',
  enteredAt: 'enteredAt',
  studyCenterId: 'studyCenterId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  departmentId: 'departmentId',
  title: 'title',
  content: 'content',
  type: 'type',
  priority: 'priority',
  postedBy: 'postedBy',
  postedAt: 'postedAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProgramAllocationScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  studyCenterId: 'studyCenterId',
  programId: 'programId',
  allocatedBy: 'allocatedBy',
  allocatedAt: 'allocatedAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletTopUpScalarFieldEnum = {
  id: 'id',
  studyCenterId: 'studyCenterId',
  organizationId: 'organizationId',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  referenceNumber: 'referenceNumber',
  proofDocument: 'proofDocument',
  status: 'status',
  remarks: 'remarks',
  verifiedBy: 'verifiedBy',
  verifiedAt: 'verifiedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProgramFeeStructureScalarFieldEnum = {
  id: 'id',
  programId: 'programId',
  organizationId: 'organizationId',
  billingCycle: 'billingCycle',
  baseFee: 'baseFee',
  additionalFees: 'additionalFees',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  centerId: 'centerId',
  studentId: 'studentId',
  amount: 'amount',
  gstPercentage: 'gstPercentage',
  gstAmount: 'gstAmount',
  total: 'total',
  status: 'status',
  paidAt: 'paidAt',
  period: 'period',
  type: 'type',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentEntryScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  invoiceId: 'invoiceId',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  referenceNumber: 'referenceNumber',
  receivedBy: 'receivedBy',
  receivedAt: 'receivedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseClaimScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  category: 'category',
  amount: 'amount',
  description: 'description',
  receipts: 'receipts',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  remarks: 'remarks',
  submittedAt: 'submittedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TargetScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  departmentId: 'departmentId',
  employeeId: 'employeeId',
  centerId: 'centerId',
  type: 'type',
  period: 'period',
  target: 'target',
  achieved: 'achieved',
  incentive: 'incentive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GSTSettingScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  feeType: 'feeType',
  gstPercentage: 'gstPercentage',
  hsnCode: 'hsnCode',
  sacCode: 'sacCode',
  applicableFrom: 'applicableFrom',
  applicableTo: 'applicableTo',
  allowOverride: 'allowOverride',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  oldValue: 'oldValue',
  newValue: 'newValue',
  ipAddress: 'ipAddress',
  timestamp: 'timestamp'
};

exports.Prisma.UniversityAuthFeeScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  universityId: 'universityId',
  amount: 'amount',
  currency: 'currency',
  configuredBy: 'configuredBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollBatchScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  batchNumber: 'batchNumber',
  month: 'month',
  payrollIds: 'payrollIds',
  totalAmount: 'totalAmount',
  employeeCount: 'employeeCount',
  status: 'status',
  transferredBy: 'transferredBy',
  transferredAt: 'transferredAt',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  rejectedBy: 'rejectedBy',
  rejectedAt: 'rejectedAt',
  rejectionReason: 'rejectionReason',
  completedAt: 'completedAt',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VacancyScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  departmentId: 'departmentId',
  designation: 'designation',
  count: 'count',
  filled: 'filled',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplaintScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  employeeId: 'employeeId',
  subject: 'subject',
  description: 'description',
  category: 'category',
  status: 'status',
  priority: 'priority',
  submittedAt: 'submittedAt',
  resolvedAt: 'resolvedAt',
  resolution: 'resolution',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HolidayScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  date: 'date',
  type: 'type',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  priority: 'priority',
  read: 'read',
  link: 'link',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  data: 'data'
};

exports.Prisma.CeoPanelScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  assignedUserId: 'assignedUserId',
  name: 'name',
  dataScope: 'dataScope',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DesignationScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  departmentId: 'departmentId',
  subDepartmentId: 'subDepartmentId',
  branchId: 'branchId',
  title: 'title',
  level: 'level',
  parentDesignationId: 'parentDesignationId',
  maxHeadcount: 'maxHeadcount',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudyCenterInviteScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  token: 'token',
  universityIds: 'universityIds',
  programIds: 'programIds',
  referredBy: 'referredBy',
  branchId: 'branchId',
  status: 'status',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EscalationScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  type: 'type',
  entityId: 'entityId',
  entityType: 'entityType',
  raisedById: 'raisedById',
  raisedAt: 'raisedAt',
  currentLevel: 'currentLevel',
  maxLevel: 'maxLevel',
  status: 'status',
  description: 'description',
  impact: 'impact',
  chain: 'chain',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  resolvedAt: 'resolvedAt',
  resolvedById: 'resolvedById'
};

exports.Prisma.LeadScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  centerName: 'centerName',
  contactName: 'contactName',
  email: 'email',
  phone: 'phone',
  address: 'address',
  source: 'source',
  referredById: 'referredById',
  status: 'status',
  notes: 'notes',
  convertedAt: 'convertedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveAllocationScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  year: 'year',
  sickLeave: 'sickLeave',
  casualLeave: 'casualLeave',
  earnedLeave: 'earnedLeave',
  complementaryLeave: 'complementaryLeave',
  usedSick: 'usedSick',
  usedCasual: 'usedCasual',
  usedEarned: 'usedEarned',
  usedComplementary: 'usedComplementary',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EditDeleteRequestScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  requesterId: 'requesterId',
  requesterName: 'requesterName',
  targetCollection: 'targetCollection',
  targetId: 'targetId',
  requestType: 'requestType',
  message: 'message',
  proposedChanges: 'proposedChanges',
  currentData: 'currentData',
  status: 'status',
  respondedById: 'respondedById',
  respondedAt: 'respondedAt',
  responseRemarks: 'responseRemarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  organizationId: 'organizationId',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender',
  bloodGroup: 'bloodGroup',
  address: 'address',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  emergencyContact: 'emergencyContact',
  employeeCode: 'employeeCode',
  joinDate: 'joinDate',
  confirmationDate: 'confirmationDate',
  probationEndDate: 'probationEndDate',
  employmentType: 'employmentType',
  workLocation: 'workLocation',
  ctc: 'ctc',
  basicSalary: 'basicSalary',
  bankName: 'bankName',
  bankAccountNo: 'bankAccountNo',
  ifscCode: 'ifscCode',
  panNumber: 'panNumber',
  documents: 'documents',
  kpis: 'kpis',
  kras: 'kras',
  lastReviewDate: 'lastReviewDate',
  nextReviewDate: 'nextReviewDate',
  overallRating: 'overallRating',
  reviewRemarks: 'reviewRemarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CredentialRequestScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  requesterId: 'requesterId',
  requesterName: 'requesterName',
  requesterRole: 'requesterRole',
  ipAddress: 'ipAddress',
  targetCredential: 'targetCredential',
  targetCollection: 'targetCollection',
  targetId: 'targetId',
  remarks: 'remarks',
  status: 'status',
  respondedById: 'respondedById',
  respondedAt: 'respondedAt',
  responseRemarks: 'responseRemarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IncentiveStructureScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  targetType: 'targetType',
  applicableTo: 'applicableTo',
  tiers: 'tiers',
  period: 'period',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PollScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  question: 'question',
  options: 'options',
  createdBy: 'createdBy',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  allowMultiple: 'allowMultiple',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProgramMaterialScalarFieldEnum = {
  id: 'id',
  programId: 'programId',
  organizationId: 'organizationId',
  title: 'title',
  description: 'description',
  category: 'category',
  fileUrl: 'fileUrl',
  fileName: 'fileName',
  fileSize: 'fileSize',
  mimeType: 'mimeType',
  semesterNumber: 'semesterNumber',
  uploadedBy: 'uploadedBy',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReregRuleScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  carryForwardEnabled: 'carryForwardEnabled',
  autoApproveThreshold: 'autoApproveThreshold',
  notifyFinanceOnMiss: 'notifyFinanceOnMiss',
  gracePeriodDays: 'gracePeriodDays',
  penaltyAmount: 'penaltyAmount',
  escalationRules: 'escalationRules',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReregistrationScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  studentId: 'studentId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionRequestScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  centerId: 'centerId',
  centerName: 'centerName',
  requestedBy: 'requestedBy',
  sessionDetails: 'sessionDetails',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Organization: 'Organization',
  User: 'User',
  Department: 'Department',
  SubDepartment: 'SubDepartment',
  Branch: 'Branch',
  StudyCenter: 'StudyCenter',
  University: 'University',
  Program: 'Program',
  License: 'License',
  HRSettings: 'HRSettings',
  FeeStructure: 'FeeStructure',
  SalaryConfig: 'SalaryConfig',
  Task: 'Task',
  Attendance: 'Attendance',
  LeaveRequest: 'LeaveRequest',
  Enrollment: 'Enrollment',
  Student: 'Student',
  EnrollmentPayment: 'EnrollmentPayment',
  Payroll: 'Payroll',
  StudyCenterWallet: 'StudyCenterWallet',
  ReferralLink: 'ReferralLink',
  AdmissionSession: 'AdmissionSession',
  InternalMark: 'InternalMark',
  Announcement: 'Announcement',
  ProgramAllocation: 'ProgramAllocation',
  WalletTopUp: 'WalletTopUp',
  ProgramFeeStructure: 'ProgramFeeStructure',
  Invoice: 'Invoice',
  PaymentEntry: 'PaymentEntry',
  ExpenseClaim: 'ExpenseClaim',
  Target: 'Target',
  GSTSetting: 'GSTSetting',
  AuditLog: 'AuditLog',
  UniversityAuthFee: 'UniversityAuthFee',
  PayrollBatch: 'PayrollBatch',
  Vacancy: 'Vacancy',
  Complaint: 'Complaint',
  Holiday: 'Holiday',
  Notification: 'Notification',
  CeoPanel: 'CeoPanel',
  Designation: 'Designation',
  StudyCenterInvite: 'StudyCenterInvite',
  Escalation: 'Escalation',
  Lead: 'Lead',
  LeaveAllocation: 'LeaveAllocation',
  EditDeleteRequest: 'EditDeleteRequest',
  EmployeeProfile: 'EmployeeProfile',
  CredentialRequest: 'CredentialRequest',
  IncentiveStructure: 'IncentiveStructure',
  Poll: 'Poll',
  ProgramMaterial: 'ProgramMaterial',
  ReregRule: 'ReregRule',
  Reregistration: 'Reregistration',
  SessionRequest: 'SessionRequest'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
