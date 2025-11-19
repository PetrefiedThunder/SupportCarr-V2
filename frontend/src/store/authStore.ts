import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, RiderProfile, DriverProfile, UserRole } from '@/types';
import { authApi } from '@/api/auth';
import { tokenStorage } from '@/api/client';

/**
 * Auth Store State
 */
interface AuthState {
  // State
  user: User | null;
  profile: RiderProfile | DriverProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signUp: (data: {
    phoneNumber: string;
    role: UserRole;
    name: string;
    email?: string;
  }) => Promise<void>;
  signIn: (phoneNumber: string) => Promise<void>;
  verifyOTP: (phoneNumber: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  updateProfile: (profile: RiderProfile | DriverProfile) => void;
}

/**
 * Auth Store
 *
 * Manages authentication state and user session
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Sign up new user
       */
      signUp: async (data) => {
        set({ isLoading: true, error: null });

        try {
          await authApi.signUp(data);
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Sign up failed',
          });
          throw error;
        }
      },

      /**
       * Request OTP for sign in
       */
      signIn: async (phoneNumber) => {
        set({ isLoading: true, error: null });

        try {
          await authApi.signIn({ phoneNumber });
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Sign in failed',
          });
          throw error;
        }
      },

      /**
       * Verify OTP and complete authentication
       */
      verifyOTP: async (phoneNumber, code) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.verifyOTP({ phoneNumber, code });

          // Store tokens
          tokenStorage.setAccessToken(response.tokens.accessToken);
          tokenStorage.setRefreshToken(response.tokens.refreshToken);

          // Update state
          set({
            user: response.user,
            profile: response.profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'OTP verification failed',
          });
          throw error;
        }
      },

      /**
       * Sign out
       */
      signOut: async () => {
        try {
          await authApi.signOut();
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Sign out error:', error);
        } finally {
          // Clear tokens and state
          tokenStorage.clearTokens();
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      /**
       * Refresh authentication state
       */
      refreshAuth: async () => {
        if (!tokenStorage.hasTokens()) {
          set({ isAuthenticated: false, user: null, profile: null });
          return;
        }

        set({ isLoading: true });

        try {
          const [user, profile] = await Promise.all([
            authApi.getCurrentUser(),
            authApi.getCurrentProfile(),
          ]);

          set({
            user,
            profile,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // If refresh fails, clear auth state
          tokenStorage.clearTokens();
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Update profile (after profile edits)
       */
      updateProfile: (profile) => {
        set({ profile });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

/**
 * Selectors
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useProfile = () => useAuthStore((state) => state.profile);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useUserRole = () => useAuthStore((state) => state.user?.role);
