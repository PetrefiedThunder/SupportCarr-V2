import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { User, RescueRequest, PaymentRecord } from '../models/index.js';

const router = express.Router();

// All routes require admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get dashboard stats
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = {
    totalUsers: await User.countDocuments(),
    totalRescues: await RescueRequest.countDocuments(),
    activeRescues: await RescueRequest.countDocuments({
      status: { $in: ['pending', 'accepted', 'driver_enroute', 'in_progress'] }
    }),
  };
  res.json({ success: true, data: { stats } });
}));

// Get all users
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find().limit(100);
  res.json({ success: true, data: { users } });
}));

// Get all rescues
router.get('/rescues', asyncHandler(async (req, res) => {
  const rescues = await RescueRequest.find().limit(100);
  res.json({ success: true, data: { rescues } });
}));

// Ban user
router.post('/users/:id/ban', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  user.isBanned = true;
  user.banReason = req.body.reason || 'No reason provided';
  user.bannedAt = new Date();
  await user.save();

  res.json({ success: true, message: 'User banned' });
}));

export default router;
