import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { 
  createHiringRequest, 
  getHiringRequests, 
  updateHiringRequestStatus, 
  addCandidate, 
  updateCandidateStatus, 
  getManagerHiringRequests,
  getMyDocuments
} from '../controllers/hiringController.js';

const router = Router();

// Employee API
router.get('/my-documents', protect, getMyDocuments);

// Manager API (accessible to any authenticated manager/staff who has My Hiring Requests)
router.post('/request', protect, createHiringRequest);
router.get('/manager-requests', protect, getManagerHiringRequests);

// HR API
router.get('/requests', protect, authorize('hr_admin', 'hr_sub_admin', 'hr', 'ceo', 'org_admin', 'superadmin'), getHiringRequests);
router.put('/requests/:id/status', protect, authorize('hr_admin', 'hr_sub_admin', 'hr', 'ceo', 'org_admin', 'superadmin'), updateHiringRequestStatus);

router.post('/candidates', protect, authorize('hr_admin', 'hr_sub_admin', 'hr', 'ceo', 'org_admin', 'superadmin'), addCandidate);
router.put('/candidates/:id/status', protect, authorize('hr_admin', 'hr_sub_admin', 'hr', 'ceo', 'org_admin', 'superadmin'), updateCandidateStatus);

export default router;
