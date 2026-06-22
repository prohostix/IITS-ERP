// @ts-nocheck
import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  bulkImportUsers,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/bulk-import', authorize('superadmin', 'org_admin', 'hr_admin'), bulkImportUsers);

router
  .route('/')
  .get(getUsers)
  .post(authorize('superadmin', 'org_admin', 'hr_admin'), createUser);

router
  .route('/:id')
  .get(getUser)
  .put(authorize('superadmin', 'org_admin', 'hr_admin'), updateUser)
  .delete(authorize('superadmin', 'org_admin', 'hr_admin'), deleteUser);

export default router;
