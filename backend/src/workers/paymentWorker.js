import { Worker } from 'bullmq';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import stripeService from '../services/stripeService.js';
import { PaymentRecord, RescueRequest, User } from '../models/index.js';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

/**
 * Payment Worker
 */
export const paymentWorker = new Worker(
  'payments',
  async (job) => {
    logger.info('Processing payment job', {
      jobId: job.id,
      type: job.name,
    });

    try {
      switch (job.name) {
        case 'charge-customer':
          return await processChargeCustomer(job.data);

        case 'process-payout':
          return await processDriverPayout(job.data);

        case 'process-refund':
          return await processRefund(job.data);

        case 'weekly-payouts':
          return await processWeeklyPayouts();

        case 'failed-payment-retry':
          return await retryFailedPayment(job.data);

        default:
          logger.warn('Unknown payment job type', { type: job.name });
      }

      return { success: true };
    } catch (error) {
      logger.error('Payment job failed:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 3, // Lower concurrency for payment processing
  }
);

/**
 * Charge customer for rescue
 */
async function processChargeCustomer(data) {
  const { rescueId, paymentRecordId } = data;

  const rescue = await RescueRequest.findById(rescueId).populate('riderId');
  const paymentRecord = await PaymentRecord.findById(paymentRecordId);

  if (!rescue || !paymentRecord) {
    throw new Error('Rescue or payment record not found');
  }

  try {
    // Confirm payment intent with Stripe
    const paymentIntent = await stripeService.stripe.paymentIntents.confirm(
      paymentRecord.stripe.paymentIntentId
    );

    // Update payment record
    await paymentRecord.markAsSucceeded({
      chargeId: paymentIntent.latest_charge,
      receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
    });

    logger.info('Customer charged successfully', {
      rescueId,
      amount: paymentRecord.amount,
    });

    // Queue driver payout
    const { addPaymentJob } = await import('../queues/index.js');
    await addPaymentJob('process-payout', {
      paymentRecordId: paymentRecord._id,
    });

    return { success: true, paymentRecord };
  } catch (error) {
    await paymentRecord.markAsFailed(error.code, error.message);
    throw error;
  }
}

/**
 * Process driver payout
 */
async function processDriverPayout(data) {
  const { paymentRecordId } = data;

  const paymentRecord = await PaymentRecord.findById(paymentRecordId).populate('driverId');

  if (!paymentRecord || !paymentRecord.driverId) {
    throw new Error('Payment record or driver not found');
  }

  const driver = paymentRecord.driverId;
  if (!driver.stripeAccountId) {
    throw new Error('Driver does not have Stripe account');
  }

  const payoutAmount = paymentRecord.breakdown.total - paymentRecord.breakdown.platformFee;

  try {
    const transfer = await stripeService.transferToDriver(
      payoutAmount,
      driver.stripeAccountId,
      {
        paymentRecordId: paymentRecord._id.toString(),
        rescueRequestId: paymentRecord.rescueRequestId.toString(),
      }
    );

    await paymentRecord.processPayout(payoutAmount, transfer.id);

    logger.info('Driver payout processed', {
      driverId: driver._id,
      amount: payoutAmount,
    });

    return { success: true, transfer };
  } catch (error) {
    logger.error('Driver payout failed:', error);
    throw error;
  }
}

/**
 * Process refund
 */
async function processRefund(data) {
  const { paymentRecordId, amount, reason } = data;

  const paymentRecord = await PaymentRecord.findById(paymentRecordId);

  if (!paymentRecord) {
    throw new Error('Payment record not found');
  }

  try {
    const refund = await stripeService.createRefund(
      paymentRecord.stripe.paymentIntentId,
      amount,
      reason
    );

    await paymentRecord.processRefund(refund.amount / 100, reason);

    logger.info('Refund processed', {
      paymentRecordId,
      amount: refund.amount / 100,
    });

    return { success: true, refund };
  } catch (error) {
    logger.error('Refund failed:', error);
    throw error;
  }
}

/**
 * Process weekly payouts for all drivers
 */
async function processWeeklyPayouts() {
  const pendingPayouts = await PaymentRecord.findPendingPayouts();

  logger.info('Processing weekly payouts', {
    count: pendingPayouts.length,
  });

  const results = [];

  for (const paymentRecord of pendingPayouts) {
    try {
      const result = await processDriverPayout({
        paymentRecordId: paymentRecord._id,
      });
      results.push({ success: true, paymentRecordId: paymentRecord._id });
    } catch (error) {
      logger.error('Weekly payout failed for payment record', {
        paymentRecordId: paymentRecord._id,
        error: error.message,
      });
      results.push({ success: false, paymentRecordId: paymentRecord._id, error: error.message });
    }
  }

  return { results };
}

/**
 * Retry failed payment
 */
async function retryFailedPayment(data) {
  const { paymentRecordId } = data;

  // Use atomic update to prevent race condition when retrying
  const paymentRecord = await PaymentRecord.findOneAndUpdate(
    {
      _id: paymentRecordId,
      status: 'failed', // Only retry if status is failed
    },
    {
      $set: {
        status: 'processing',
        'failureReason.code': null,
        'failureReason.message': null,
      },
    },
    { new: true }
  );

  if (!paymentRecord) {
    throw new Error('Payment record not found or not in failed state');
  }

  return await processChargeCustomer({
    rescueId: paymentRecord.rescueRequestId,
    paymentRecordId: paymentRecord._id,
  });
}

// Worker event handlers
paymentWorker.on('completed', (job) => {
  logger.info('Payment job completed', {
    jobId: job.id,
    name: job.name,
  });
});

paymentWorker.on('failed', (job, err) => {
  logger.error('Payment job failed', {
    jobId: job.id,
    name: job.name,
    error: err.message,
  });
});

export default paymentWorker;
