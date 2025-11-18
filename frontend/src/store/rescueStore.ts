import { create } from 'zustand';
import type { RescueRequest, RescueAssignment, CreateRescueFormData } from '@/types';
import { rescueApi } from '@/api/rescues';

/**
 * Rescue Store State
 */
interface RescueState {
  // State
  currentRescue: RescueRequest | null;
  rescueHistory: RescueRequest[];
  assignment: RescueAssignment | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createRescue: (data: CreateRescueFormData) => Promise<RescueRequest>;
  fetchActiveRescue: () => Promise<void>;
  fetchRescueHistory: (page?: number) => Promise<void>;
  fetchAssignment: (rescueId: string) => Promise<void>;
  cancelRescue: (rescueId: string, reason: string) => Promise<void>;
  updateRescueStatus: (rescue: RescueRequest) => void;
  updateDriverLocation: (location: { latitude: number; longitude: number }) => void;
  clearCurrentRescue: () => void;
  clearError: () => void;
}

/**
 * Rescue Store
 *
 * Manages rescue request state for riders
 */
export const useRescueStore = create<RescueState>((set, get) => ({
  // Initial state
  currentRescue: null,
  rescueHistory: [],
  assignment: null,
  isLoading: false,
  error: null,

  /**
   * Create new rescue request
   */
  createRescue: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const rescue = await rescueApi.createRescue(data);

      set({
        currentRescue: rescue,
        isLoading: false,
      });

      return rescue;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create rescue',
      });
      throw error;
    }
  },

  /**
   * Fetch active rescue
   */
  fetchActiveRescue: async () => {
    set({ isLoading: true, error: null });

    try {
      const rescue = await rescueApi.getActiveRescue();

      set({
        currentRescue: rescue,
        isLoading: false,
      });

      // If we have an active rescue, fetch assignment details
      if (rescue) {
        get().fetchAssignment(rescue._id);
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active rescue',
      });
    }
  },

  /**
   * Fetch rescue history
   */
  fetchRescueHistory: async (page = 1) => {
    set({ isLoading: true, error: null });

    try {
      const response = await rescueApi.getMyRescues({ page, limit: 20 });

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
   * Fetch rescue assignment (driver info)
   */
  fetchAssignment: async (rescueId) => {
    try {
      const assignment = await rescueApi.getRescueAssignment(rescueId);

      set({ assignment });
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    }
  },

  /**
   * Cancel rescue
   */
  cancelRescue: async (rescueId, reason) => {
    set({ isLoading: true, error: null });

    try {
      const rescue = await rescueApi.cancelRescue(rescueId, reason);

      set({
        currentRescue: rescue,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to cancel rescue',
      });
      throw error;
    }
  },

  /**
   * Update rescue status (from WebSocket)
   */
  updateRescueStatus: (rescue) => {
    const { currentRescue } = get();

    if (currentRescue && currentRescue._id === rescue._id) {
      set({ currentRescue: rescue });
    }

    // Update in history if it exists
    set((state) => ({
      rescueHistory: state.rescueHistory.map((r) =>
        r._id === rescue._id ? rescue : r,
      ),
    }));
  },

  /**
   * Update driver location (from WebSocket)
   */
  updateDriverLocation: (location) => {
    const { assignment } = get();

    if (assignment) {
      set({
        assignment: {
          ...assignment,
          driverLocation: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
        },
      });
    }
  },

  /**
   * Clear current rescue
   */
  clearCurrentRescue: () => {
    set({ currentRescue: null, assignment: null });
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
export const useCurrentRescue = () => useRescueStore((state) => state.currentRescue);
export const useRescueAssignment = () => useRescueStore((state) => state.assignment);
export const useRescueHistory = () => useRescueStore((state) => state.rescueHistory);
