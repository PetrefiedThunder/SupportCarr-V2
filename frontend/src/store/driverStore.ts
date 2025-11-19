import { create } from 'zustand';
import type { DriverProfile, RescueRequest, Vehicle } from '@/types';
import { driverApi } from '@/api/drivers';

/**
 * Driver Store State
 */
interface DriverState {
  // State
  profile: DriverProfile | null;
  activeRescue: RescueRequest | null;
  availableRescues: RescueRequest[];
  rescueHistory: RescueRequest[];
  vehicles: Vehicle[];
  earnings: {
    totalEarnings: number;
    completedRescues: number;
    averageEarningsPerRescue: number;
  } | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  updateLocation: (location: { latitude: number; longitude: number }) => Promise<void>;
  toggleOnline: (isOnline: boolean) => Promise<void>;
  toggleAvailability: (isAvailable: boolean) => Promise<void>;
  fetchAvailableRescues: () => Promise<void>;
  acceptRescue: (rescueId: string) => Promise<void>;
  rejectRescue: (rescueId: string, reason: string) => Promise<void>;
  updateRescueStatus: (rescueId: string, status: string) => Promise<void>;
  completeRescue: (rescueId: string, finalPrice: number) => Promise<void>;
  fetchActiveRescue: () => Promise<void>;
  fetchRescueHistory: (page?: number) => Promise<void>;
  fetchEarnings: (startDate?: string, endDate?: string) => Promise<void>;
  fetchVehicles: () => Promise<void>;
  clearError: () => void;
}

/**
 * Driver Store
 *
 * Manages driver-specific state
 */
export const useDriverStore = create<DriverState>((set, get) => ({
  // Initial state
  profile: null,
  activeRescue: null,
  availableRescues: [],
  rescueHistory: [],
  vehicles: [],
  earnings: null,
  isLoading: false,
  error: null,

  /**
   * Fetch driver profile
   */
  fetchProfile: async () => {
    set({ isLoading: true, error: null });

    try {
      const profile = await driverApi.getProfile();

      set({
        profile,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
      });
    }
  },

  /**
   * Update driver location
   */
  updateLocation: async (location) => {
    try {
      await driverApi.updateLocation(location);

      // Update profile location
      if (get().profile) {
        set((state) => ({
          profile: state.profile
            ? {
                ...state.profile,
                location: {
                  coordinates: {
                    type: 'Point',
                    coordinates: [location.longitude, location.latitude],
                  },
                  address: state.profile.location?.address || {
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'US',
                  },
                  formattedAddress: `${location.latitude}, ${location.longitude}`,
                },
              }
            : null,
        }));
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  },

  /**
   * Toggle online status
   */
  toggleOnline: async (isOnline) => {
    set({ isLoading: true, error: null });

    try {
      const profile = await driverApi.toggleOnline(isOnline);

      set({
        profile,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to toggle online status',
      });
      throw error;
    }
  },

  /**
   * Toggle availability
   */
  toggleAvailability: async (isAvailable) => {
    set({ isLoading: true, error: null });

    try {
      const profile = await driverApi.toggleAvailability(isAvailable);

      set({
        profile,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to toggle availability',
      });
      throw error;
    }
  },

  /**
   * Fetch available rescues nearby
   */
  fetchAvailableRescues: async () => {
    try {
      const rescues = await driverApi.getAvailableRescues({ radiusMiles: 10, limit: 20 });

      set({ availableRescues: rescues });
    } catch (error) {
      console.error('Failed to fetch available rescues:', error);
    }
  },

  /**
   * Accept rescue request
   */
  acceptRescue: async (rescueId) => {
    set({ isLoading: true, error: null });

    try {
      const rescue = await driverApi.acceptRescue(rescueId);

      set({
        activeRescue: rescue,
        availableRescues: get().availableRescues.filter((r) => r._id !== rescueId),
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to accept rescue',
      });
      throw error;
    }
  },

  /**
   * Reject rescue request
   */
  rejectRescue: async (rescueId, reason) => {
    try {
      await driverApi.rejectRescue(rescueId, reason);

      set({
        availableRescues: get().availableRescues.filter((r) => r._id !== rescueId),
      });
    } catch (error) {
      console.error('Failed to reject rescue:', error);
      throw error;
    }
  },

  /**
   * Update rescue status
   */
  updateRescueStatus: async (rescueId, status) => {
    set({ isLoading: true, error: null });

    try {
      const rescue = await driverApi.updateRescueStatus(rescueId, status);

      set({
        activeRescue: rescue,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update rescue status',
      });
      throw error;
    }
  },

  /**
   * Complete rescue
   */
  completeRescue: async (rescueId, finalPrice) => {
    set({ isLoading: true, error: null });

    try {
      const rescue = await driverApi.completeRescue(rescueId, finalPrice);

      set({
        activeRescue: null,
        rescueHistory: [rescue, ...get().rescueHistory],
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to complete rescue',
      });
      throw error;
    }
  },

  /**
   * Fetch active rescue
   */
  fetchActiveRescue: async () => {
    try {
      const rescue = await driverApi.getActiveRescue();

      set({ activeRescue: rescue });
    } catch (error) {
      console.error('Failed to fetch active rescue:', error);
    }
  },

  /**
   * Fetch rescue history
   */
  fetchRescueHistory: async (page = 1) => {
    set({ isLoading: true, error: null });

    try {
      const response = await driverApi.getRescueHistory({ page, limit: 20 });

      set({
        rescueHistory: page === 1 ? response.data : [...get().rescueHistory, ...response.data],
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rescue history',
      });
    }
  },

  /**
   * Fetch earnings
   */
  fetchEarnings: async (startDate, endDate) => {
    try {
      const earnings = await driverApi.getEarnings({ startDate, endDate });

      set({ earnings });
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    }
  },

  /**
   * Fetch vehicles
   */
  fetchVehicles: async () => {
    try {
      const vehicles = await driverApi.getVehicles();

      set({ vehicles });
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));

/**
 * Selectors
 */
export const useDriverProfile = () => useDriverStore((state) => state.profile);
export const useActiveRescue = () => useDriverStore((state) => state.activeRescue);
export const useAvailableRescues = () => useDriverStore((state) => state.availableRescues);
export const useIsDriverOnline = () => useDriverStore((state) => state.profile?.isOnline ?? false);
export const useIsDriverAvailable = () => useDriverStore((state) => state.profile?.isAvailable ?? false);
