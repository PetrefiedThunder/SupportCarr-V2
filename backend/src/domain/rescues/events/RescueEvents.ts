import { DomainEvent } from '@shared/events/DomainEvent';
import { ObjectId } from '@shared/types';
import { RescueStatus } from '../value-objects/RescueStatus';
import { RescueType } from '../value-objects/RescueType';
import { Location } from '@shared/value-objects/Location';
import { Money } from '@shared/value-objects/Money';

/**
 * Rescue Requested Event
 *
 * Published when a rider creates a new rescue request
 */
export class RescueRequestedEvent extends DomainEvent {
  constructor(
    public readonly rescueId: ObjectId,
    public readonly riderId: ObjectId,
    public readonly type: RescueType,
    public readonly pickupLocation: Location,
    public readonly estimatedPrice: Money,
    public readonly description: string,
  ) {
    super('RescueRequested', rescueId, 'Rescue', riderId);
  }

  protected getPayload(): Record<string, unknown> {
    return {
      rescueId: this.rescueId.toString(),
      riderId: this.riderId.toString(),
      type: this.type,
      pickupLocation: this.pickupLocation.toJSON(),
      estimatedPrice: this.estimatedPrice.toJSON(),
      description: this.description,
    };
  }
}

/**
 * Rescue Status Changed Event
 *
 * Published when rescue status transitions
 */
export class RescueStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly rescueId: ObjectId,
    public readonly riderId: ObjectId,
    public readonly fromStatus: RescueStatus,
    public readonly toStatus: RescueStatus,
    public readonly changedBy?: ObjectId,
  ) {
    super('RescueStatusChanged', rescueId, 'Rescue', changedBy);
  }

  protected getPayload(): Record<string, unknown> {
    return {
      rescueId: this.rescueId.toString(),
      riderId: this.riderId.toString(),
      fromStatus: this.fromStatus,
      toStatus: this.toStatus,
      changedBy: this.changedBy?.toString(),
    };
  }
}

/**
 * Driver Assigned Event
 *
 * Published when a driver is assigned to a rescue
 */
export class DriverAssignedEvent extends DomainEvent {
  constructor(
    public readonly rescueId: ObjectId,
    public readonly riderId: ObjectId,
    public readonly driverId: ObjectId,
    public readonly estimatedArrivalTime: number, // in minutes
  ) {
    super('DriverAssigned', rescueId, 'Rescue', driverId);
  }

  protected getPayload(): Record<string, unknown> {
    return {
      rescueId: this.rescueId.toString(),
      riderId: this.riderId.toString(),
      driverId: this.driverId.toString(),
      estimatedArrivalTime: this.estimatedArrivalTime,
    };
  }
}

/**
 * Rescue Completed Event
 *
 * Published when a rescue is successfully completed
 */
export class RescueCompletedEvent extends DomainEvent {
  constructor(
    public readonly rescueId: ObjectId,
    public readonly riderId: ObjectId,
    public readonly driverId: ObjectId,
    public readonly finalPrice: Money,
    public readonly duration: number, // in milliseconds
  ) {
    super('RescueCompleted', rescueId, 'Rescue');
  }

  protected getPayload(): Record<string, unknown> {
    return {
      rescueId: this.rescueId.toString(),
      riderId: this.riderId.toString(),
      driverId: this.driverId.toString(),
      finalPrice: this.finalPrice.toJSON(),
      duration: this.duration,
    };
  }
}

/**
 * Rescue Cancelled Event
 *
 * Published when a rescue is cancelled
 */
export class RescueCancelledEvent extends DomainEvent {
  constructor(
    public readonly rescueId: ObjectId,
    public readonly riderId: ObjectId,
    public readonly cancelledBy: ObjectId,
    public readonly reason: string,
  ) {
    super('RescueCancelled', rescueId, 'Rescue', cancelledBy);
  }

  protected getPayload(): Record<string, unknown> {
    return {
      rescueId: this.rescueId.toString(),
      riderId: this.riderId.toString(),
      cancelledBy: this.cancelledBy.toString(),
      reason: this.reason,
    };
  }
}

/**
 * Driver Location Updated Event
 *
 * Published when driver location changes during active rescue
 */
export class DriverLocationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly rescueId: ObjectId,
    public readonly driverId: ObjectId,
    public readonly location: Location,
    public readonly speed?: number, // mph
    public readonly heading?: number, // degrees
  ) {
    super('DriverLocationUpdated', rescueId, 'Rescue', driverId);
  }

  protected getPayload(): Record<string, unknown> {
    return {
      rescueId: this.rescueId.toString(),
      driverId: this.driverId.toString(),
      location: this.location.toJSON(),
      speed: this.speed,
      heading: this.heading,
    };
  }
}
