import express from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getAssignableUsers,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/assignable-users', getAssignableUsers);
router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.put('/:id/complete', upload.array('evidence', 5), completeTask);

export default router;
