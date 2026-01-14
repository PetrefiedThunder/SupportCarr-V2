import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { DriverProfile, Vehicle } from '../models/index.js';

const router = express.Router();

// Create driver profile
router.post('/profile', authenticate, asyncHandler(async (req, res) => {
  // Whitelist allowed fields to prevent mass assignment
  const allowedFields = [
    'licenseNumber',
    'licenseState',
    'licenseExpiryDate',
    'insuranceProvider',
    'insurancePolicyNumber',
    'insuranceExpiryDate',
    'serviceArea',
    'preferences',
  ];

  const profileData = { userId: req.userId };

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      profileData[field] = req.body[field];
    }
  });

  const profile = await DriverProfile.create(profileData);
  res.status(201).json({ success: true, data: { profile } });
}));

// Get driver profile
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const profile = await DriverProfile.findOne({ userId: req.userId });
  res.json({ success: true, data: { profile } });
}));

// Update location
router.post('/location', authenticate, authorize('driver'), asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const profile = await DriverProfile.findOne({ userId: req.userId });

  if (!profile) {
    return res.status(404).json({
      success: false,
      error: 'Driver profile not found',
    });
  }

  await profile.updateLocation(longitude, latitude);
  res.json({ success: true, data: { profile } });
}));

// Set availability
router.post('/availability', authenticate, authorize('driver'), asyncHandler(async (req, res) => {
  const { isAvailable } = req.body;
  const profile = await DriverProfile.findOne({ userId: req.userId });

  if (!profile) {
    return res.status(404).json({
      success: false,
      error: 'Driver profile not found',
    });
  }

  profile.isAvailable = isAvailable;
  await profile.save();
  res.json({ success: true, data: { profile } });
}));

// Get nearby rescues
router.get('/rescues/nearby', authenticate, authorize('driver'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: { rescues: [] } });
}));

export default router;
