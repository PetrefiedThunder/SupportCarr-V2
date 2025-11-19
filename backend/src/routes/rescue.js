import express from 'express';
import { authenticate, requirePhoneVerified, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';
import { RescueRequest } from '../models/index.js';
import { createRescueValidation, updateRescueStatusValidation } from '../middleware/validators.js';
import notificationService from '../services/notificationService.js';
import config from '../config/index.js';

const router = express.Router();

// Calculate pricing server-side
const calculatePricing = (pickupLocation, dropoffLocation) => {
  // Calculate distance between pickup and dropoff (simplified - use proper distance calculation)
  const basePrice = config.business.baseRescuePrice;
  const platformFeePercent = config.stripe.platformFeePercent;
  const driverPayoutPercent = config.business.driverPayoutPercent;

  const subtotal = basePrice;
  const platformFee = (subtotal * platformFeePercent) / 100;
  const total = subtotal;
  const driverPayout = (subtotal * driverPayoutPercent) / 100;

  return {
    basePrice,
    subtotal,
    platformFee,
    total,
    driverPayout,
  };
};

// Create rescue request
router.post('/', authenticate, requirePhoneVerified, createRescueValidation, asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, issue, ebike } = req.body;

  const pricing = calculatePricing(pickupLocation, dropoffLocation);

  const rescue = await RescueRequest.create({
    riderId: req.userId,
    pickupLocation,
    dropoffLocation,
    issue,
    ebike,
    pricing,
  });

  res.status(201).json({ success: true, data: { rescue } });
}));

// Get all rescues for current user
router.get('/', authenticate, asyncHandler(async (req, res) => {
  let rescues;
  if (req.user.role === 'driver') {
    rescues = await RescueRequest.findByDriver(req.userId);
  } else {
    rescues = await RescueRequest.findByRider(req.userId);
  }
  res.json({ success: true, data: { rescues } });
}));

// Get rescue by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const rescue = await RescueRequest.findById(req.params.id);

  if (!rescue) {
    throw new NotFoundError('Rescue request not found');
  }

  // Verify user is rider, driver, or admin
  const isRider = rescue.riderId.toString() === req.userId;
  const isDriver = rescue.driverId?.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isRider && !isDriver && !isAdmin) {
    throw new ForbiddenError('Not authorized to view this rescue request');
  }

  res.json({ success: true, data: { rescue } });
}));

// Update rescue status
router.put('/:id/status', authenticate, updateRescueStatusValidation, asyncHandler(async (req, res) => {
  const rescue = await RescueRequest.findById(req.params.id);

  if (!rescue) {
    throw new NotFoundError('Rescue request not found');
  }

  // Verify user is driver or admin
  const isDriver = rescue.driverId?.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isDriver && !isAdmin) {
    throw new ForbiddenError('Not authorized to update this rescue status');
  }

  rescue.status = req.body.status;
  await rescue.save();
  res.json({ success: true, data: { rescue } });
}));

// Cancel rescue
router.post('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const rescue = await RescueRequest.findById(req.params.id);

  if (!rescue) {
    throw new NotFoundError('Rescue request not found');
  }

  // Verify user is rider or driver
  const isRider = rescue.riderId.toString() === req.userId;
  const isDriver = rescue.driverId?.toString() === req.userId;

  if (!isRider && !isDriver) {
    throw new ForbiddenError('Not authorized to cancel this rescue request');
  }

  const cancelledBy = isRider ? 'rider' : 'driver';
  await rescue.cancel(cancelledBy, req.body.reason);
  res.json({ success: true, data: { rescue } });
}));

export default router;
