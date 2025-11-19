import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ToastProvider } from '@/components/providers';

// Auth Pages
import { SignIn, SignUp, VerifyOTP } from '@/pages/auth';

// Public Pages
import { Home } from '@/pages/Home';

// Rider Pages
import { RiderDashboard, RequestRescue, TrackRescue } from '@/pages/rider';

// Driver Pages
import { DriverDashboard, ActiveRescue, Earnings } from '@/pages/driver';

// Types
import { UserRole } from '@/types';

/**
 * Protected Route Component
 *
 * Wrapper for routes that require authentication
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole }) => {
  const { isAuthenticated, profile } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (requireRole && profile?.role !== requireRole) {
    // Redirect to appropriate dashboard based on user role
    const dashboardPath =
      profile?.role === UserRole.RIDER ? '/rider/dashboard' : '/driver/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

/**
 * Main App Component
 *
 * Routing configuration for the entire application
 */
function App() {
  const { isAuthenticated, profile } = useAuthStore();

  /**
   * Get redirect path for authenticated users
   */
  const getAuthenticatedRedirect = () => {
    if (!profile) return '/';

    return profile.role === UserRole.RIDER
      ? '/rider/dashboard'
      : '/driver/dashboard';
  };

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />

        {/* Auth Routes */}
        <Route
          path="/signin"
          element={
            isAuthenticated ? (
              <Navigate to={getAuthenticatedRedirect()} replace />
            ) : (
              <SignIn />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to={getAuthenticatedRedirect()} replace />
            ) : (
              <SignUp />
            )
          }
        />
        <Route
          path="/verify-otp"
          element={
            isAuthenticated ? (
              <Navigate to={getAuthenticatedRedirect()} replace />
            ) : (
              <VerifyOTP />
            )
          }
        />

        {/* Rider Routes */}
        <Route
          path="/rider/dashboard"
          element={
            <ProtectedRoute requireRole={UserRole.RIDER}>
              <RiderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/request"
          element={
            <ProtectedRoute requireRole={UserRole.RIDER}>
              <RequestRescue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/rescue/:rescueId"
          element={
            <ProtectedRoute requireRole={UserRole.RIDER}>
              <TrackRescue />
            </ProtectedRoute>
          }
        />

        {/* Driver Routes */}
        <Route
          path="/driver/dashboard"
          element={
            <ProtectedRoute requireRole={UserRole.DRIVER}>
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/rescue/:rescueId"
          element={
            <ProtectedRoute requireRole={UserRole.DRIVER}>
              <ActiveRescue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/earnings"
          element={
            <ProtectedRoute requireRole={UserRole.DRIVER}>
              <Earnings />
            </ProtectedRoute>
          }
        />

        {/* Fallback Routes */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Navigate to={getAuthenticatedRedirect()} replace />
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />

        {/* 404 Not Found */}
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900">404</h1>
                <p className="mt-4 text-xl text-gray-600">Page not found</p>
                <a
                  href="/"
                  className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
                >
                  Go Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>

      {/* Global Toast Notifications */}
      <ToastProvider />
    </>
  );
}

export default App;
