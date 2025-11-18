import Stripe from 'stripe';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { PaymentRecord } from '../models/index.js';

class StripeService {
  constructor() {
    this.stripe = null;
    this.initialized = false;

    if (config.stripe.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey, {
        apiVersion: '2023-10-16',
      });
      this.initialized = true;
      logger.info('Stripe service initialized');
    } else {
      logger.warn('Stripe credentials not configured');
    }
  }

  /**
   * Create customer
   */
  async createCustomer(email, phoneNumber, metadata = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const customer = await this.stripe.customers.create({
        email,
        phone: phoneNumber,
        metadata,
      });

      logger.info('Stripe customer created', {
        customerId: customer.id,
      });

      return customer;
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create connected account for driver
   */
  async createConnectedAccount(email, metadata = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const account = await this.stripe.accounts.create({
        type: 'express',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata,
      });

      logger.info('Stripe connected account created', {
        accountId: account.id,
      });

      return account;
    } catch (error) {
      logger.error('Failed to create Stripe connected account:', error);
      throw error;
    }
  }

  /**
   * Create account link for onboarding
   */
  async createAccountLink(accountId, refreshUrl, returnUrl) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      logger.error('Failed to create account link:', error);
      throw error;
    }
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(amount, currency, customerId, metadata = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      logger.info('Payment intent confirmed', {
        paymentIntentId,
        status: paymentIntent.status,
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to confirm payment intent:', error);
      throw error;
    }
  }

  /**
   * Charge customer for rescue
   */
  async chargeRescue(rescueRequest, customerId, paymentMethodId = null) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const amount = rescueRequest.pricing.total;

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(
        amount,
        'usd',
        customerId,
        {
          rescueRequestId: rescueRequest._id.toString(),
          riderId: rescueRequest.riderId.toString(),
          driverId: rescueRequest.driverId?.toString(),
        }
      );

      // Create payment record
      const paymentRecord = await PaymentRecord.create({
        rescueRequestId: rescueRequest._id,
        riderId: rescueRequest.riderId,
        driverId: rescueRequest.driverId,
        type: 'charge',
        status: 'processing',
        amount,
        currency: 'usd',
        paymentMethod: 'card',
        stripe: {
          paymentIntentId: paymentIntent.id,
          customerId,
          paymentMethodId,
        },
        breakdown: {
          subtotal: rescueRequest.pricing.subtotal,
          platformFee: rescueRequest.pricing.platformFee,
          tip: rescueRequest.pricing.tip,
          discount: rescueRequest.pricing.discount,
          total: rescueRequest.pricing.total,
        },
      });

      return {
        paymentIntent,
        paymentRecord,
      };
    } catch (error) {
      logger.error('Failed to charge rescue:', error);
      throw error;
    }
  }

  /**
   * Create transfer to driver
   */
  async transferToDriver(amount, driverAccountId, metadata = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: driverAccountId,
        metadata,
      });

      logger.info('Transfer to driver created', {
        transferId: transfer.id,
        amount,
        destination: driverAccountId,
      });

      return transfer;
    } catch (error) {
      logger.error('Failed to create transfer:', error);
      throw error;
    }
  }

  /**
   * Process payout to driver
   */
  async processDriverPayout(paymentRecordId) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const paymentRecord = await PaymentRecord.findById(paymentRecordId).populate('driver');

      if (!paymentRecord) {
        throw new Error('Payment record not found');
      }

      const driver = paymentRecord.driver;
      if (!driver || !driver.stripeAccountId) {
        throw new Error('Driver Stripe account not found');
      }

      const payoutAmount = paymentRecord.breakdown.total - paymentRecord.breakdown.platformFee;

      const transfer = await this.transferToDriver(
        payoutAmount,
        driver.stripeAccountId,
        {
          paymentRecordId: paymentRecord._id.toString(),
          rescueRequestId: paymentRecord.rescueRequestId.toString(),
        }
      );

      // Update payment record
      await paymentRecord.processPayout(payoutAmount, transfer.id);

      return transfer;
    } catch (error) {
      logger.error('Failed to process driver payout:', error);
      throw error;
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const refundData = {
        payment_intent: paymentIntentId,
        reason,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

      logger.info('Refund created', {
        refundId: refund.id,
        amount: refund.amount / 100,
      });

      return refund;
    } catch (error) {
      logger.error('Failed to create refund:', error);
      throw error;
    }
  }

  /**
   * Get customer payment methods
   */
  async getCustomerPaymentMethods(customerId) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      logger.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      logger.info('Payment method attached', {
        paymentMethodId,
        customerId,
      });

      return paymentMethod;
    } catch (error) {
      logger.error('Failed to attach payment method:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );

      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw error;
    }
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount) {
    return (amount * config.stripe.platformFeePercent) / 100;
  }

  /**
   * Calculate driver payout
   */
  calculateDriverPayout(totalAmount) {
    const platformFee = this.calculatePlatformFee(totalAmount);
    return totalAmount - platformFee;
  }
}

export default new StripeService();
