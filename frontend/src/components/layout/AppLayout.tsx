import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * App Layout Props
 */
export interface AppLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  className?: string;
}

/**
 * App Layout Component
 *
 * Main layout wrapper with header and navigation
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showHeader = true,
  className,
}) => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">SupportCarr</span>
            </Link>

            {/* Navigation */}
            {isAuthenticated && (
              <nav className="flex items-center gap-6">
                {/* Role-specific navigation */}
                {profile?.role === 'rider' && (
                  <>
                    <Link
                      to="/rider/dashboard"
                      className="text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/rider/rescues"
                      className="text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      My Rescues
                    </Link>
                  </>
                )}

                {profile?.role === 'driver' && (
                  <>
                    <Link
                      to="/driver/dashboard"
                      className="text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/driver/rescues"
                      className="text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      Active Rescues
                    </Link>
                    <Link
                      to="/driver/earnings"
                      className="text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      Earnings
                    </Link>
                  </>
                )}

                {/* User menu */}
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {profile?.name || user?.phoneNumber}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                  </div>

                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </nav>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn('flex-1', className)}>{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SupportCarr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

AppLayout.displayName = 'AppLayout';
