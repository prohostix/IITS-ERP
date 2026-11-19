import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getVisitors,
  createVisitor,
  updateVisitor,
  checkOutVisitor,
  deleteVisitor,
  getMeetingRooms,
  createMeetingRoom,
  updateMeetingRoom,
  deleteMeetingRoom,
  getRoomBookings,
  getMyRoomBookings,
  createRoomBooking,
  updateRoomBooking,
  updateBookingStatus,
  deleteRoomBooking,
  getOfficeHosts,
} from '../controllers/frontOfficeController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// 1. Visitors Routes
router.route('/visitors')
  .get(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin', 'general_manager', 'project_manager'), getVisitors)
  .post(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'), createVisitor);

router.route('/visitors/:id')
  .put(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'), updateVisitor)
  .delete(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'), deleteVisitor);

router.patch(
  '/visitors/:id/checkout',
  authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'),
  checkOutVisitor
);

// 2. Meeting Rooms Routes
router.route('/rooms')
  .get(getMeetingRooms)
  .post(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin'), createMeetingRoom);

router.route('/rooms/:id')
  .put(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin'), updateMeetingRoom)
  .delete(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin'), deleteMeetingRoom);

// 3. Room Bookings Routes
router.get('/my-bookings', getMyRoomBookings);

router.route('/bookings')
  .get(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin', 'general_manager', 'project_manager', 'branch_manager'), getRoomBookings)
  .post(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'), createRoomBooking);

router.route('/bookings/:id')
  .put(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'), updateRoomBooking)
  .delete(authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'), deleteRoomBooking);

router.patch(
  '/bookings/:id/status',
  authorize('superadmin', 'org_admin', 'ceo', 'front_office_admin', 'hr_admin'),
  updateBookingStatus
);

// 4. Hosts / Users List
router.get('/hosts', getOfficeHosts);

export default router;

