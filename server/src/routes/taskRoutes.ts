// @ts-nocheck
import express from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getAssignableUsers,
  getPendingExplanationTask,
  submitTaskExplanation,
  resolveTaskEscalation,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/assignable-users', getAssignableUsers);
router.get('/pending-explanation', getPendingExplanationTask);
router.post('/:id/explanation', upload.array('evidence', 5), submitTaskExplanation);
router.post('/:id/resolve-escalation', resolveTaskEscalation);

router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.put('/:id/complete', upload.array('evidence', 5), completeTask);

export default router;
