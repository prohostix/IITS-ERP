import express from 'express';
import {
  getLicenses,
  getLicense,
  createLicense,
  updateLicense,
  deleteLicense,
} from '../controllers/licenseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

router.route('/').get(getLicenses).post(createLicense);
router.route('/:id').get(getLicense).put(updateLicense).delete(deleteLicense);

export default router;
