import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useDriverStore } from '@/store/driverStore';
import { useDriverWebSocket } from '@/hooks/useWebSocket';
import { useRequireAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { AppLayout, Container } from '@/components/layout';
import { Card, CardHeader, CardContent, Button, Badge, Spinner } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { RescueStatus, UserRole } from '@/types';

/**
 * Active Rescue Page for Drivers
 *
 * Manage and update status of current rescue
 */
export const ActiveRescue: React.FC = () => {
  useRequireAuth(UserRole.DRIVER);

  const { rescueId } = useParams<{ rescueId: string }>();
  const navigate = useNavigate();

  const profile = useAuthStore((state) => state.profile);
  const {
    activeRescue,
    isLoading,
    acceptRescue,
    updateRescueStatus,
    completeRescue,
  } = useDriverStore();
  const showToast = useUIStore((state) => state.showToast);

  const [isUpdating, setIsUpdating] = useState(false);

  // Subscribe to real-time updates
  useDriverWebSocket(rescueId);

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

  /**
   * Handle accept rescue
   */
  const handleAcceptRescue = async () => {
    if (!rescueId) return;

    setIsUpdating(true);
    try {
      await acceptRescue(rescueId);
      showToast({
        type: 'success',
        message: 'Rescue accepted! Head to the pickup location.',
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to accept rescue';
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle status update
   */
  const handleStatusUpdate = async (newStatus: RescueStatus) => {
    if (!rescueId) return;

    setIsUpdating(true);
    try {
      await updateRescueStatus(rescueId, newStatus);
      showToast({
        type: 'success',
        message: `Status updated to ${formatStatus(newStatus)}`,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update status';
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle complete rescue
   */
  const handleCompleteRescue = async () => {
    if (!rescueId) return;

    setIsUpdating(true);
    try {
      await completeRescue(rescueId);
      showToast({
        type: 'success',
        message: 'Rescue completed successfully!',
      });
      navigate('/driver/dashboard');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to complete rescue';
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Get next action based on current status
   */
  const getNextAction = () => {
    if (!activeRescue) return null;

    switch (activeRescue.status) {
      case RescueStatus.MATCHED:
        return {
          label: 'Accept Rescue',
          action: handleAcceptRescue,
          variant: 'primary' as const,
        };
      case RescueStatus.ACCEPTED:
        return {
          label: "I'm on the way",
          action: () => handleStatusUpdate(RescueStatus.EN_ROUTE),
          variant: 'primary' as const,
        };
      case RescueStatus.EN_ROUTE:
        return {
          label: "I've arrived",
          action: () => handleStatusUpdate(RescueStatus.ARRIVED),
          variant: 'primary' as const,
        };
      case RescueStatus.ARRIVED:
        return {
          label: 'Start working',
          action: () => handleStatusUpdate(RescueStatus.IN_PROGRESS),
          variant: 'primary' as const,
        };
      case RescueStatus.IN_PROGRESS:
        return {
          label: 'Complete rescue',
          action: handleCompleteRescue,
          variant: 'success' as const,
        };
      default:
        return null;
    }
  };

  if (isLoading || !activeRescue) {
    return (
      <AppLayout>
        <Container className="py-12">
          <div className="flex justify-center">
            <Spinner size="lg" label="Loading rescue details..." />
          </div>
        </Container>
      </AppLayout>
    );
  }

  // Check if this rescue is assigned to the current driver
  if (activeRescue.driverId && activeRescue.driverId !== profile?._id) {
    return (
      <AppLayout>
        <Container className="py-12">
          <Card variant="elevated" padding="lg">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
              <p className="mt-2 text-gray-600">
                This rescue is not assigned to you.
              </p>
              <Button
                onClick={() => navigate('/driver/dashboard')}
                variant="primary"
                className="mt-6"
              >
                Go to Dashboard
              </Button>
            </div>
          </Card>
        </Container>
      </AppLayout>
    );
  }

  const nextAction = getNextAction();
  const isCompleted = activeRescue.status === RescueStatus.COMPLETED;

  return (
    <AppLayout>
      <Container className="py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Active Rescue</h1>
            <p className="mt-1 text-gray-600">
              {isCompleted
                ? 'Completed'
                : formatRelativeTime(
                    activeRescue.acceptedAt || activeRescue.createdAt,
                  )}
            </p>
          </div>
          <Badge variant={getStatusVariant(activeRescue.status)} size="lg">
            {formatStatus(activeRescue.status)}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map Placeholder */}
          <div className="lg:col-span-2">
            <Card variant="elevated" padding="none" className="h-[500px]">
              <div className="flex h-full items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
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
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">Map view coming soon</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Navigation with Mapbox integration
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Rescue Details & Actions */}
          <div className="space-y-6">
            {/* Actions Card */}
            {nextAction && !isCompleted && (
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Next Step
                </h3>
                <Button
                  variant={nextAction.variant}
                  size="lg"
                  onClick={nextAction.action}
                  isLoading={isUpdating}
                  isFullWidth
                >
                  {nextAction.label}
                </Button>
              </Card>
            )}

            {/* Rescue Info */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Rescue Details
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="mt-1 font-medium text-gray-900 capitalize">
                    {activeRescue.type.replace('_', ' ')}
                  </p>
                </div>

                {activeRescue.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="mt-1 text-gray-900">{activeRescue.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Pickup Location</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {activeRescue.pickupLocation.address ||
                      `${activeRescue.pickupLocation.coordinates[1].toFixed(6)}, ${activeRescue.pickupLocation.coordinates[0].toFixed(6)}`}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Your Earning</p>
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    {formatCurrency(
                      activeRescue.finalPrice?.amountInCents ||
                        activeRescue.estimatedPrice.amountInCents,
                      activeRescue.estimatedPrice.currency,
                    )}
                  </p>
                  {!activeRescue.finalPrice && (
                    <p className="text-xs text-gray-500">Estimated</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Contact Rider */}
            {!isCompleted && (
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Contact Rider
                </h3>
                <Button variant="outline" size="sm" isFullWidth>
                  Call Rider
                </Button>
              </Card>
            )}

            {/* Back Button */}
            {isCompleted && (
              <Button
                variant="primary"
                onClick={() => navigate('/driver/dashboard')}
                isFullWidth
              >
                Back to Dashboard
              </Button>
            )}
          </div>
        </div>
      </Container>
    </AppLayout>
  );
};

ActiveRescue.displayName = 'ActiveRescue';
