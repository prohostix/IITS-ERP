import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { 
  createHiringRequest, 
  getHiringRequests, 
  updateHiringRequestStatus, 
  addCandidate, 
  updateCandidateStatus, 
  getManagerHiringRequests 
} from '../controllers/hiringController';

const router = Router();

// Manager API
router.post('/request', authorize('ops_admin', 'ops_sub_admin', 'org_admin', 'hr_admin', 'sales_admin', 'finance_admin', 'center_admin', 'university_admin', 'superadmin'), createHiringRequest);
router.get('/manager-requests', authorize('ops_admin', 'ops_sub_admin', 'org_admin', 'hr_admin', 'sales_admin', 'finance_admin', 'center_admin', 'university_admin', 'superadmin'), getManagerHiringRequests);

// HR API
router.get('/requests', authorize('hr_admin', 'org_admin', 'superadmin'), getHiringRequests);
router.put('/requests/:id/status', authorize('hr_admin', 'org_admin', 'superadmin'), updateHiringRequestStatus);

router.post('/candidates', authorize('hr_admin', 'org_admin', 'superadmin'), addCandidate);
router.put('/candidates/:id/status', authorize('hr_admin', 'org_admin', 'superadmin'), updateCandidateStatus);

export default router;
