import express from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getDashboardMetrics);

export default router;
