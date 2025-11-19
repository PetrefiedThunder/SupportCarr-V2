import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useDriverStore } from '@/store/driverStore';
import { useRequireAuth } from '@/hooks/useAuth';
import { AppLayout, Container } from '@/components/layout';
import { Card, CardHeader, CardContent, Button, Badge, Spinner } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { RescueStatus, UserRole } from '@/types';

/**
 * Driver Dashboard Page
 *
 * Overview of active rescue and available requests
 */
export const DriverDashboard: React.FC = () => {
  useRequireAuth(UserRole.DRIVER);

  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const {
    activeRescue,
    availableRescues,
    isOnline,
    isLoading,
    setOnlineStatus,
    fetchActiveRescue,
    fetchAvailableRescues,
  } = useDriverStore();

  /**
   * Load driver data on mount
   */
  useEffect(() => {
    fetchActiveRescue();
    if (isOnline) {
      fetchAvailableRescues();
    }
  }, [fetchActiveRescue, fetchAvailableRescues, isOnline]);

  /**
   * Toggle online status
   */
  const handleToggleOnline = async () => {
    await setOnlineStatus(!isOnline);
    if (!isOnline) {
      fetchAvailableRescues();
    }
  };

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status: RescueStatus) => {
    switch (status) {
      case RescueStatus.MATCHED:
      case RescueStatus.ACCEPTED:
        return 'primary';
      case RescueStatus.EN_ROUTE:
      case RescueStatus.ARRIVED:
      case RescueStatus.IN_PROGRESS:
        return 'warning';
      case RescueStatus.COMPLETED:
        return 'success';
      default:
        return 'default';
    }
  };

  /**
   * Format status for display
   */
  const formatStatus = (status: RescueStatus): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (isLoading && !activeRescue && availableRescues.length === 0) {
    return (
      <AppLayout>
        <Container className="py-12">
          <div className="flex justify-center">
            <Spinner size="lg" label="Loading your dashboard..." />
          </div>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {profile?.name}!
            </h1>
            <p className="mt-2 text-gray-600">
              {isOnline
                ? activeRescue
                  ? 'You have an active rescue'
                  : 'Ready to accept rescue requests'
                : 'You are currently offline'}
            </p>
          </div>

          {/* Online Status Toggle */}
          <div className="flex items-center gap-3">
            <Badge variant={isOnline ? 'success' : 'default'} size="lg">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Button
              variant={isOnline ? 'outline' : 'primary'}
              onClick={handleToggleOnline}
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>
        </div>

        {/* Active Rescue */}
        {activeRescue ? (
          <Card variant="elevated" padding="lg" className="mb-8">
            <CardHeader
              title="Active Rescue"
              subtitle={`Started ${formatRelativeTime(activeRescue.acceptedAt || activeRescue.createdAt)}`}
              action={
                <Badge variant={getStatusVariant(activeRescue.status)} size="lg">
                  {formatStatus(activeRescue.status)}
                </Badge>
              }
            />

            <CardContent>
              <div className="mt-6 space-y-4">
                {/* Rescue Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Rescue Type</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900 capitalize">
                      {activeRescue.type.replace('_', ' ')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Earning</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {formatCurrency(
                        activeRescue.finalPrice?.amountInCents ||
                          activeRescue.estimatedPrice.amountInCents,
                        activeRescue.estimatedPrice.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Pickup Location
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {activeRescue.pickupLocation.address ||
                        `${activeRescue.pickupLocation.coordinates[1].toFixed(6)}, ${activeRescue.pickupLocation.coordinates[0].toFixed(6)}`}
                    </p>
                  </div>

                  {activeRescue.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Description
                      </h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {activeRescue.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => navigate(`/driver/rescue/${activeRescue._id}`)}
                    variant="primary"
                  >
                    Continue Rescue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isOnline ? (
          <>
            {/* Available Rescues */}
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">
                Available Rescues
              </h2>

              {availableRescues.length === 0 ? (
                <Card variant="outlined" padding="lg">
                  <div className="text-center py-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      No rescues available
                    </h3>
                    <p className="mt-2 text-gray-600">
                      We'll notify you when a rescue request comes in nearby
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {availableRescues.map((rescue) => (
                    <Card key={rescue._id} variant="elevated" padding="md">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-medium text-gray-900 capitalize">
                              {rescue.type.replace('_', ' ')}
                            </h3>
                            <Badge variant="info">New</Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {formatRelativeTime(rescue.createdAt)}
                          </p>
                          {rescue.description && (
                            <p className="mt-2 text-sm text-gray-700">
                              {rescue.description}
                            </p>
                          )}
                          <p className="mt-2 text-sm text-gray-600">
                            📍{' '}
                            {rescue.pickupLocation.address ||
                              `${rescue.pickupLocation.coordinates[1].toFixed(4)}, ${rescue.pickupLocation.coordinates[0].toFixed(4)}`}
                          </p>
                        </div>
                        <div className="ml-6 text-right">
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(
                              rescue.estimatedPrice.amountInCents,
                              rescue.estimatedPrice.currency,
                            )}
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              navigate(`/driver/rescue/${rescue._id}`)
                            }
                            className="mt-2"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <Card variant="elevated" padding="lg">
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">You're Offline</h3>
              <p className="mt-2 text-gray-600">
                Go online to start accepting rescue requests
              </p>
              <Button
                onClick={handleToggleOnline}
                variant="primary"
                size="lg"
                className="mt-6"
              >
                Go Online
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        {isOnline && !activeRescue && (
          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Quick Stats</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card variant="outlined" padding="lg">
                <h3 className="text-sm font-medium text-gray-500">
                  Today's Earnings
                </h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">$0.00</p>
              </Card>

              <Card variant="outlined" padding="lg">
                <h3 className="text-sm font-medium text-gray-500">
                  Completed Today
                </h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">0</p>
              </Card>

              <Card variant="outlined" padding="lg">
                <h3 className="text-sm font-medium text-gray-500">Rating</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">5.0 ⭐</p>
              </Card>
            </div>
          </div>
        )}
      </Container>
    </AppLayout>
  );
};

DriverDashboard.displayName = 'DriverDashboard';
