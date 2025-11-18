import express from 'express';
import { authenticate, requirePhoneVerified } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { RescueRequest } from '../models/index.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Create rescue request
router.post('/', authenticate, requirePhoneVerified, asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, issue, ebike } = req.body;

  const rescue = await RescueRequest.create({
    riderId: req.userId,
    pickupLocation,
    dropoffLocation,
    issue,
    ebike,
    pricing: {
      basePrice: 25,
      subtotal: 25,
      platformFee: 5,
      total: 25,
      driverPayout: 20,
    },
  });

  res.status(201).json({ success: true, data: { rescue } });
}));

// Get all rescues for current user
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const rescues = await RescueRequest.findByRider(req.userId);
  res.json({ success: true, data: { rescues } });
}));

// Get rescue by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const rescue = await RescueRequest.findById(req.params.id);
  res.json({ success: true, data: { rescue } });
}));

// Update rescue status
router.put('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const rescue = await RescueRequest.findById(req.params.id);
  rescue.status = req.body.status;
  await rescue.save();
  res.json({ success: true, data: { rescue } });
}));

// Cancel rescue
router.post('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const rescue = await RescueRequest.findById(req.params.id);
  await rescue.cancel('rider', req.body.reason);
  res.json({ success: true, data: { rescue } });
}));

export default router;
