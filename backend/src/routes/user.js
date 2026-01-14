import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.js';
import { User } from '../models/index.js';

const router = express.Router();

// Get user by ID - only admin or self
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.params.id === req.userId;

  if (!isAdmin && !isSelf) {
    throw new ForbiddenError('Not authorized to view this user');
  }

  const user = await User.findById(req.params.id)
    .populate('riderProfile')
    .populate({
      path: 'driverProfile',
      populate: { path: 'vehicleId' },
    });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({ success: true, data: { user } });
}));

// Update user - only admin or self
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.params.id === req.userId;

  if (!isAdmin && !isSelf) {
    throw new ForbiddenError('Not authorized to update this user');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Only allow specific fields to be updated
  const allowedFields = ['firstName', 'lastName', 'email', 'avatar'];
  const adminOnlyFields = ['role', 'isActive', 'isBanned', 'balance'];

  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      user[key] = req.body[key];
    } else if (isAdmin && adminOnlyFields.includes(key)) {
      user[key] = req.body[key];
    }
  });

  await user.save();

  res.json({ success: true, data: { user } });
}));

export default router;
