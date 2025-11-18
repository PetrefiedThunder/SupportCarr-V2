import { get, post, del } from './client';
import type { PaymentMethod, Payment, PaginatedResponse } from '@/types';

/**
 * Payment API Service
 */
export const paymentApi = {
  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return get('/api/v1/payments/methods');
  },

  /**
   * Add payment method
   */
  async addPaymentMethod(stripePaymentMethodId: string): Promise<PaymentMethod> {
    return post('/api/v1/payments/methods', { stripePaymentMethodId });
  },

  /**
   * Remove payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    return del(`/api/v1/payments/methods/${paymentMethodId}`);
  },

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    return post(`/api/v1/payments/methods/${paymentMethodId}/set-default`);
  },

  /**
   * Get payment history
   */
  async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Payment>> {
    return get('/api/v1/payments/history', params);
  },

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    return get(`/api/v1/payments/${paymentId}`);
  },

  /**
   * Get Stripe publishable key
   */
  async getStripePublishableKey(): Promise<{ publishableKey: string }> {
    return get('/api/v1/payments/stripe/key');
  },

  /**
   * Create payment intent for rescue
   */
  async createPaymentIntent(rescueId: string): Promise<{ clientSecret: string }> {
    return post('/api/v1/payments/intents', { rescueId });
  },
};
