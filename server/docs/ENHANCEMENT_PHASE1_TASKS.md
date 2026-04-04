# Phase 1: Core Infrastructure & Models

## Immediate Tasks (Priority Order)

### Task 1: Install Required Dependencies

#### Backend Dependencies
```bash
cd server
npm install bull redis socket.io node-cron ip
npm install --save-dev @types/bull @types/redis @types/node-cron
```

#### Frontend Dependencies
```bash
cd client
npm install socket.io-client recharts react-beautiful-dnd
npm install --save-dev @types/recharts
```

### Task 2: Create New Mongoose Models

#### 1.1 Custom Department Model
**File**: `server/src/models/CustomDepartment.ts`
```typescript
interface ICustomDepartment {
  organizationId: ObjectId;
  name: string;
  type: 'preset' | 'custom';
  features: string[]; // ['tasks', 'announcements', 'reports']
  dashboardWidgets: string[];
  rolePermissions: Map<string, string[]>;
  createdBy: ObjectId;
  status: 'active' | 'inactive';
}
```

#### 1.2 CEO Panel Model
**File**: `server/src/models/CeoPanel.ts`
```typescript
interface ICeoPanel {
  organizationId: ObjectId;
  assignedUserId: ObjectId;
  dataScope: string[]; // ['all', 'operations', 'finance']
  name: string;
  createdAt: Date;
  status: 'active' | 'inactive';
}
```

#### 2.1 Escalation Log Model
**File**: `server/src/models/EscalationLog.ts`
```typescript
interface IEscalationLog {
  organizationId: ObjectId;
  taskId: ObjectId;
  employeeId: ObjectId;
  deptAdminId: ObjectId;
  ceoId?: ObjectId;
  escalatedAt: Date;
  status: 'pending' | 'resolved' | 'reassigned' | 'extended' | 'justified';
  chain: {
    level: 'employee' | 'dept_admin' | 'ceo';
    userId: ObjectId;
    action: string;
    timestamp: Date;
  }[];
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: ObjectId;
}
```

#### 3.1 Sub-Department Model
**File**: `server/src/models/SubDepartment.ts`
```typescript
interface ISubDepartment {
  organizationId: ObjectId;
  name: 'OpenSchool' | 'Online' | 'Skill' | 'BVoc';
  parentDeptId: ObjectId; // Operations department
  features: string[];
  assignedUniversities?: ObjectId[];
  assignedPrograms?: ObjectId[];
  status: 'active' | 'inactive';
}
```

#### 3.2 Credential Request Model
**File**: `server/src/models/CredentialRequest.ts`
```typescript
interface ICredentialRequest {
  organizationId: ObjectId;
  requesterId: ObjectId;
  requesterName: string;
  ipAddress: string;
  targetCredential: string; // What credential they want to see
  targetId: ObjectId; // ID of the record
  remarks: string;
  status: 'pending' | 'approved' | 'rejected';
  respondedBy?: ObjectId;
  respondedAt?: Date;
  responseRemarks?: string;
}
```

#### 3.3 Edit/Delete Request Model
**File**: `server/src/models/EditDeleteRequest.ts`
```typescript
interface IEditDeleteRequest {
  organizationId: ObjectId;
  requesterId: ObjectId;
  targetCollection: string;
  targetId: ObjectId;
  requestType: 'edit' | 'delete';
  message: string;
  proposedChanges?: any; // For edit requests
  status: 'pending' | 'approved' | 'rejected';
  respondedBy?: ObjectId;
  respondedAt?: Date;
  responseRemarks?: string;
}
```

### Task 3: Update Existing Models

#### 3.1 Department Model Enhancement
**File**: `server/src/models/Department.ts`
Add fields:
```typescript
type: { type: String, enum: ['preset', 'custom'], default: 'preset' }
features: [String]
customConfig: Schema.Types.Mixed
```

#### 3.2 User Model Enhancement
**File**: `server/src/models/User.ts`
Add fields:
```typescript
subDepartmentId: { type: Schema.Types.ObjectId, ref: 'SubDepartment' }
ceoPanelId: { type: Schema.Types.ObjectId, ref: 'CeoPanel' }
```

#### 3.3 Task Model Enhancement
**File**: `server/src/models/Task.ts`
Add fields:
```typescript
escalationStatus: { 
  type: String, 
  enum: ['none', 'overdue_employee', 'escalated_dept', 'escalated_ceo'],
  default: 'none'
}
escalatedAt: Date
gracePeriodEnd: Date
```

### Task 4: Create Background Job Infrastructure

#### 4.1 Bull Queue Setup
**File**: `server/src/config/queue.ts`
```typescript
import Bull from 'bull';

export const escalationQueue = new Bull('escalation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const reregQueue = new Bull('rereg', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const metricsQueue = new Bull('metrics', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});
```

#### 4.2 Escalation Job Processor
**File**: `server/src/jobs/escalationProcessor.ts`
```typescript
import { escalationQueue } from '../config/queue';
import Task from '../models/Task';
import EscalationLog from '../models/EscalationLog';

escalationQueue.process(async (job) => {
  // Check for overdue tasks
  const overdueTasks = await Task.find({
    status: { $in: ['pending', 'in_progress'] },
    dueDate: { $lt: new Date() },
    escalationStatus: 'none',
  });

  for (const task of overdueTasks) {
    // Create escalation log
    // Send notifications
    // Update task status
  }
});
```

### Task 5: Set Up Socket.io

#### 5.1 Socket Server Setup
**File**: `server/src/config/socket.ts`
```typescript
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5194',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-org', (organizationId) => {
      socket.join(`org-${organizationId}`);
    });

    socket.on('join-role', (role) => {
      socket.join(`role-${role}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};
```

### Task 6: Update RBAC Middleware

#### 6.1 Enhanced Authorization
**File**: `server/src/middleware/auth.ts`
Add new roles:
```typescript
export const ROLES = {
  SUPERADMIN: 'superadmin',
  CEO: 'ceo',
  ORG_ADMIN: 'org_admin',
  DEPT_ADMIN: 'dept_admin',
  SUBDEPT_ADMIN: 'subdept_admin',
  EMPLOYEE: 'employee',
  CENTER: 'center',
  STUDENT: 'student',
  // Specific department admins
  OPS_ADMIN: 'ops_admin',
  FINANCE_ADMIN: 'finance_admin',
  HR_ADMIN: 'hr_admin',
  SALES_ADMIN: 'sales_admin',
};

export const SUBDEPT_ROLES = {
  OPENSCHOOL_ADMIN: 'openschool_admin',
  ONLINE_ADMIN: 'online_admin',
  SKILL_ADMIN: 'skill_admin',
  BVOC_ADMIN: 'bvoc_admin',
};
```

### Task 7: Create API Routes Structure

#### 7.1 Organization Admin Routes
**File**: `server/src/routes/orgAdminRoutes.ts`
```typescript
import express from 'express';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('org_admin', 'superadmin'));

// Custom departments
router.post('/departments', createCustomDepartment);
router.get('/departments', getCustomDepartments);

// CEO panels
router.post('/ceo-panels', createCeoPanel);
router.get('/ceo-panels', getCeoPanels);
router.patch('/ceo-panels/:id', updateCeoPanel);

export default router;
```

#### 7.2 CEO Routes
**File**: `server/src/routes/ceoRoutes.ts`
```typescript
import express from 'express';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('ceo'));

// Metrics
router.get('/metrics/performance', getPerformanceMetrics);
router.get('/metrics/risk', getRiskMetrics);

// Escalations
router.get('/escalations', getEscalations);
router.patch('/escalations/:id', handleEscalation);

export default router;
```

## Implementation Checklist

### Backend Setup
- [ ] Install Bull, Redis, Socket.io dependencies
- [ ] Create all 6 new models (CustomDepartment, CeoPanel, EscalationLog, SubDepartment, CredentialRequest, EditDeleteRequest)
- [ ] Update 3 existing models (Department, User, Task)
- [ ] Set up Bull queue configuration
- [ ] Create escalation job processor
- [ ] Initialize Socket.io server
- [ ] Update RBAC middleware with new roles
- [ ] Create orgAdminRoutes.ts
- [ ] Create ceoRoutes.ts
- [ ] Register new routes in server.ts

### Frontend Setup
- [ ] Install Socket.io-client, Recharts dependencies
- [ ] Create Socket context provider
- [ ] Create CustomDepartmentForm component
- [ ] Create CeoPanelForm component
- [ ] Create CeoDashboard component
- [ ] Create EscalationQueue component

### Testing
- [ ] Test custom department creation
- [ ] Test CEO panel creation
- [ ] Test escalation detection
- [ ] Test Socket.io connections
- [ ] Test RBAC with new roles

## Environment Variables to Add

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Socket.io
CLIENT_URL=http://localhost:5194

# Escalation Settings
ESCALATION_GRACE_PERIOD_HOURS=48
```

## Next Steps After Phase 1

1. Test all new models with sample data
2. Verify background jobs are running
3. Test real-time updates via Socket.io
4. Move to Phase 2: Finance & Operations Enhancements

---

**Status**: Ready to Begin
**Estimated Time**: 3-4 days
**Dependencies**: Redis server must be running
