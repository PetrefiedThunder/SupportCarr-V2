import { get, post, patch } from './client';
import type { DriverProfile, RescueRequest, PaginatedResponse, Vehicle, Location } from '@/types';

/**
 * Driver API Service
 */
export const driverApi = {
  /**
   * Get driver profile
   */
  async getProfile(): Promise<DriverProfile> {
    return get('/api/v1/drivers/me');
  },

  /**
   * Update driver profile
   */
  async updateProfile(data: Partial<DriverProfile>): Promise<DriverProfile> {
    return patch('/api/v1/drivers/me', data);
  },

  /**
   * Update driver location
   */
  async updateLocation(location: { latitude: number; longitude: number }): Promise<{ success: boolean }> {
    return post('/api/v1/drivers/me/location', location);
  },

  /**
   * Toggle online status
   */
  async toggleOnline(isOnline: boolean): Promise<DriverProfile> {
    return patch('/api/v1/drivers/me/online', { isOnline });
  },

  /**
   * Toggle availability
   */
  async toggleAvailability(isAvailable: boolean): Promise<DriverProfile> {
    return patch('/api/v1/drivers/me/availability', { isAvailable });
  },

  /**
   * Get available rescues nearby
   */
  async getAvailableRescues(params?: {
    radiusMiles?: number;
    limit?: number;
  }): Promise<RescueRequest[]> {
    return get('/api/v1/drivers/available-rescues', params);
  },

  /**
   * Accept rescue request
   */
  async acceptRescue(rescueId: string): Promise<RescueRequest> {
    return post(`/api/v1/drivers/rescues/${rescueId}/accept`);
  },

  /**
   * Reject rescue request
   */
  async rejectRescue(rescueId: string, reason: string): Promise<{ success: boolean }> {
    return post(`/api/v1/drivers/rescues/${rescueId}/reject`, { reason });
  },

  /**
   * Update rescue status (en_route, arrived, in_progress)
   */
  async updateRescueStatus(rescueId: string, status: string): Promise<RescueRequest> {
    return patch(`/api/v1/drivers/rescues/${rescueId}/status`, { status });
  },

  /**
   * Complete rescue
   */
  async completeRescue(rescueId: string, finalPrice: number): Promise<RescueRequest> {
    return post(`/api/v1/drivers/rescues/${rescueId}/complete`, { finalPrice });
  },

  /**
   * Get active rescue
   */
  async getActiveRescue(): Promise<RescueRequest | null> {
    return get('/api/v1/drivers/active-rescue');
  },

  /**
   * Get rescue history
   */
  async getRescueHistory(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<RescueRequest>> {
    return get('/api/v1/drivers/rescue-history', params);
  },

  /**
   * Get earnings statistics
   */
  async getEarnings(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalEarnings: number;
    completedRescues: number;
    averageEarningsPerRescue: number;
    earningsByDay: Array<{ date: string; amount: number }>;
  }> {
    return get('/api/v1/drivers/earnings', params);
  },

  /**
   * Get driver vehicles
   */
  async getVehicles(): Promise<Vehicle[]> {
    return get('/api/v1/drivers/vehicles');
  },

  /**
   * Add vehicle
   */
  async addVehicle(data: Omit<Vehicle, '_id' | 'driverId' | 'createdAt'>): Promise<Vehicle> {
    return post('/api/v1/drivers/vehicles', data);
  },

  /**
   * Update vehicle
   */
  async updateVehicle(vehicleId: string, data: Partial<Vehicle>): Promise<Vehicle> {
    return patch(`/api/v1/drivers/vehicles/${vehicleId}`, data);
  },

  /**
   * Set active vehicle
   */
  async setActiveVehicle(vehicleId: string): Promise<{ success: boolean }> {
    return post(`/api/v1/drivers/vehicles/${vehicleId}/activate`);
  },
};
