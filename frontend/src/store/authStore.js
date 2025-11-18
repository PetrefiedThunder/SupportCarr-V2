import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Sign in
      signin: async (phoneNumber, password) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/signin', { phoneNumber, password });
          const { user, accessToken, refreshToken } = response.data.data;

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Set token in API client
          api.setAuthToken(accessToken);

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Sign up
      signup: async (data) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/signup', data);
          const { user, accessToken, refreshToken } = response.data.data;

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          api.setAuthToken(accessToken);

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout
      logout: async () => {
        try {
          await api.post('/auth/logout', {
            refreshToken: get().refreshToken,
          });
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          api.setAuthToken(null);
        }
      },

      // Update user
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      // Refresh token
      refreshAccessToken: async () => {
        try {
          const response = await api.post('/auth/refresh', {
            refreshToken: get().refreshToken,
          });
          const { accessToken } = response.data.data;

          set({ accessToken });
          api.setAuthToken(accessToken);

          return accessToken;
        } catch (error) {
          // If refresh fails, logout
          get().logout();
          throw error;
        }
      },

      // Initialize auth from storage
      initialize: () => {
        const { accessToken } = get();
        if (accessToken) {
          api.setAuthToken(accessToken);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize on load
useAuthStore.getState().initialize();
