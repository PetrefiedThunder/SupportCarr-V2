import { get, post, patch, del } from './client';
import type {
  RescueRequest,
  CreateRescueFormData,
  PaginatedResponse,
  RescueAssignment,
  Rating,
} from '@/types';

/**
 * Rescue API Service
 */
export const rescueApi = {
  /**
   * Create new rescue request
   */
  async createRescue(data: CreateRescueFormData): Promise<RescueRequest> {
    return post('/api/v1/rescues', data);
  },

  /**
   * Get rescue by ID
   */
  async getRescue(rescueId: string): Promise<RescueRequest> {
    return get(`/api/v1/rescues/${rescueId}`);
  },

  /**
   * Get my rescue requests (for riders)
   */
  async getMyRescues(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<RescueRequest>> {
    return get('/api/v1/rescues/my', params);
  },

  /**
   * Get active rescue for current rider
   */
  async getActiveRescue(): Promise<RescueRequest | null> {
    return get('/api/v1/rescues/active');
  },

  /**
   * Cancel rescue
   */
  async cancelRescue(rescueId: string, reason: string): Promise<RescueRequest> {
    return patch(`/api/v1/rescues/${rescueId}/cancel`, { reason });
  },

  /**
   * Get rescue assignment (driver info)
   */
  async getRescueAssignment(rescueId: string): Promise<RescueAssignment | null> {
    return get(`/api/v1/rescues/${rescueId}/assignment`);
  },

  /**
   * Rate rescue
   */
  async rateRescue(
    rescueId: string,
    data: { rating: number; comment?: string; tags?: string[] },
  ): Promise<Rating> {
    return post(`/api/v1/rescues/${rescueId}/rate`, data);
  },

  /**
   * Upload rescue photo
   */
  async uploadPhoto(rescueId: string, file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    return post(`/api/v1/rescues/${rescueId}/photos`, formData);
  },

  /**
   * Get estimated price
   */
  async getEstimatedPrice(data: {
    type: string;
    pickupLocation: { latitude: number; longitude: number };
    dropoffLocation?: { latitude: number; longitude: number };
  }): Promise<{ estimatedPrice: number; breakdown: Record<string, number> }> {
    return post('/api/v1/rescues/estimate-price', data);
  },
};
