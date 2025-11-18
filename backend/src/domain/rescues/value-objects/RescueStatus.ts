/**
 * Rescue Status Value Object
 *
 * Represents the lifecycle status of a rescue request
 */
export enum RescueStatus {
  REQUESTED = 'requested',
  MATCHED = 'matched',
  ACCEPTED = 'accepted',
  EN_ROUTE = 'en_route',
  ARRIVED = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<RescueStatus, RescueStatus[]> = {
  [RescueStatus.REQUESTED]: [RescueStatus.MATCHED, RescueStatus.CANCELLED],
  [RescueStatus.MATCHED]: [RescueStatus.ACCEPTED, RescueStatus.CANCELLED],
  [RescueStatus.ACCEPTED]: [RescueStatus.EN_ROUTE, RescueStatus.CANCELLED],
  [RescueStatus.EN_ROUTE]: [RescueStatus.ARRIVED, RescueStatus.CANCELLED],
  [RescueStatus.ARRIVED]: [RescueStatus.IN_PROGRESS, RescueStatus.CANCELLED],
  [RescueStatus.IN_PROGRESS]: [RescueStatus.COMPLETED, RescueStatus.CANCELLED],
  [RescueStatus.COMPLETED]: [], // Terminal state
  [RescueStatus.CANCELLED]: [], // Terminal state
};

/**
 * Check if status transition is valid
 */
export function isValidTransition(from: RescueStatus, to: RescueStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions?.includes(to) ?? false;
}

/**
 * Check if status is terminal
 */
export function isTerminalStatus(status: RescueStatus): boolean {
  return status === RescueStatus.COMPLETED || status === RescueStatus.CANCELLED;
}

/**
 * Check if status is active (not terminal)
 */
export function isActiveStatus(status: RescueStatus): boolean {
  return !isTerminalStatus(status);
}

/**
 * Get all possible next statuses
 */
export function getNextStatuses(status: RescueStatus): RescueStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}
