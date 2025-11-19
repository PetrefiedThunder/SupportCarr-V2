import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { PaymentRecord, RescueRequest, User } from '../models/index.js';
import stripeService from '../services/stripeService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Create payment intent
router.post('/intent', authenticate, asyncHandler(async (req, res) => {
  const { rescueRequestId, tip = 0 } = req.body;

  if (!rescueRequestId) {
    throw new ValidationError({ rescueRequestId: 'Rescue request ID is required' });
  }

  const rescue = await RescueRequest.findById(rescueRequestId);

  if (!rescue) {
    throw new NotFoundError('Rescue request not found');
  }

  // Verify user is the rider
  if (rescue.riderId.toString() !== req.userId) {
    throw new ValidationError({ rescueRequestId: 'Not authorized to pay for this rescue' });
  }

  const user = await User.findById(req.userId);

  if (!user.stripeCustomerId) {
    throw new ValidationError({ user: 'Stripe customer not configured' });
  }

  // Update pricing with tip
  const totalAmount = rescue.pricing.total + tip;

  const paymentIntent = await stripeService.createPaymentIntent(
    totalAmount,
    'usd',
    user.stripeCustomerId,
    {
      rescueRequestId: rescue._id.toString(),
      riderId: req.userId,
    }
  );

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
    },
  });
}));

// Get payment history
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  let payments;
  if (req.user.role === 'driver') {
    payments = await PaymentRecord.findByDriver(req.userId);
  } else {
    payments = await PaymentRecord.findByRider(req.userId);
  }
  res.json({ success: true, data: { payments } });
}));

// Stripe webhook - MUST be before bodyParser middleware
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      logger.error('Stripe webhook missing signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    try {
      // Verify webhook signature
      const event = stripeService.verifyWebhookSignature(req.body, signature);

      logger.info('Stripe webhook received', { type: event.type });

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailure(event.data.object);
          break;

        case 'charge.refunded':
          await handleRefund(event.data.object);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook verification failed:', error);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  })
);

// Helper functions for webhook handlers
async function handlePaymentSuccess(paymentIntent) {
  const rescueRequestId = paymentIntent.metadata.rescueRequestId;

  if (!rescueRequestId) {
    logger.error('Payment intent missing rescueRequestId metadata');
    return;
  }

  const paymentRecord = await PaymentRecord.findOne({
    'stripe.paymentIntentId': paymentIntent.id,
  });

  if (paymentRecord) {
    paymentRecord.status = 'completed';
    paymentRecord.completedAt = new Date();
    await paymentRecord.save();
    logger.info('Payment marked as completed', { paymentRecordId: paymentRecord._id });
  }
}

async function handlePaymentFailure(paymentIntent) {
  const paymentRecord = await PaymentRecord.findOne({
    'stripe.paymentIntentId': paymentIntent.id,
  });

  if (paymentRecord) {
    paymentRecord.status = 'failed';
    paymentRecord.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    await paymentRecord.save();
    logger.info('Payment marked as failed', { paymentRecordId: paymentRecord._id });
  }
}

async function handleRefund(charge) {
  const paymentRecord = await PaymentRecord.findOne({
    'stripe.paymentIntentId': charge.payment_intent,
  });

  if (paymentRecord) {
    paymentRecord.status = 'refunded';
    paymentRecord.refundedAt = new Date();
    await paymentRecord.save();
    logger.info('Payment marked as refunded', { paymentRecordId: paymentRecord._id });
  }
}

export default router;
