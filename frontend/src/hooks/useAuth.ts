import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useIsAuthenticated, useUserRole } from '@/store';
import type { UserRole } from '@/types';

/**
 * Auth Hook
 *
 * Provides authentication utilities
 */
export function useAuth() {
  const {
    user,
    profile,
    isAuthenticated,
    isLoading,
    error,
    signUp,
    signIn,
    verifyOTP,
    signOut,
    clearError,
  } = useAuthStore();

  return {
    user,
    profile,
    isAuthenticated,
    isLoading,
    error,
    signUp,
    signIn,
    verifyOTP,
    signOut,
    clearError,
  };
}

/**
 * Protected Route Hook
 *
 * Redirects to sign-in if not authenticated
 */
export function useRequireAuth(requiredRole?: UserRole) {
  const isAuthenticated = useIsAuthenticated();
  const userRole = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin', { replace: true });
      return;
    }

    if (requiredRole && userRole !== requiredRole) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, userRole, requiredRole, navigate]);
}

/**
 * Guest Route Hook
 *
 * Redirects to dashboard if already authenticated
 */
export function useRequireGuest() {
  const isAuthenticated = useIsAuthenticated();
  const userRole = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = userRole === 'driver' ? '/driver/dashboard' : '/rider/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);
}
