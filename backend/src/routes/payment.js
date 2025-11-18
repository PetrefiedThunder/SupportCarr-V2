import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { PaymentRecord } from '../models/index.js';
import stripeService from '../services/stripeService.js';

const router = express.Router();

// Create payment intent
router.post('/intent', authenticate, asyncHandler(async (req, res) => {
  const { rescueRequestId, amount } = req.body;
  res.json({ success: true, message: 'Create payment intent' });
}));

// Get payment history
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const payments = await PaymentRecord.findByRider(req.userId);
  res.json({ success: true, data: { payments } });
}));

// Stripe webhook
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  res.json({ success: true });
}));

export default router;
