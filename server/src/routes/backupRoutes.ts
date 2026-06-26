import express from 'express';
import { exportDatabaseBackup, importDatabaseBackup } from '../controllers/backupController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin', 'org_admin'));

router.get('/export', exportDatabaseBackup);
router.post('/import', importDatabaseBackup);

export default router;
