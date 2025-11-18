import { ObjectId, IEntity, Nullable } from '@shared/types';
import { BusinessRuleViolationError, ValidationError } from '@shared/errors/DomainError';
import { Location } from '@shared/value-objects/Location';
import { Money } from '@shared/value-objects/Money';
import { RescueStatus, isValidTransition, isTerminalStatus } from '../value-objects/RescueStatus';
import { RescueType } from '../value-objects/RescueType';
import { DomainEvent } from '@shared/events/DomainEvent';

/**
 * Priority levels for rescues
 */
export enum RescuePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Bike details
 */
export interface IBikeDetails {
  make?: string;
  model?: string;
  type?: string;
}

/**
 * Rescue Entity
 *
 * Aggregate root for the Rescue bounded context
 * Encapsulates all business logic related to rescue requests
 */
export class Rescue implements IEntity {
  _id: ObjectId;
  riderId: ObjectId;
  status: RescueStatus;
  type: RescueType;
  pickupLocation: Location;
  dropoffLocation: Nullable<Location>;
  description: string;
  photos: string[];
  estimatedPrice: Money;
  finalPrice: Nullable<Money>;
  distance: Nullable<number>; // in miles
  estimatedDuration: Nullable<number>; // in minutes
  bikeDetails: IBikeDetails;
  priority: RescuePriority;
  cancellationReason: Nullable<string>;
  cancelledBy: Nullable<ObjectId>;
  requestedAt: Date;
  matchedAt: Nullable<Date>;
  acceptedAt: Nullable<Date>;
  arrivedAt: Nullable<Date>;
  completedAt: Nullable<Date>;
  cancelledAt: Nullable<Date>;
  createdAt: Date;
  updatedAt: Date;

  // Domain events to be published
  private domainEvents: DomainEvent[] = [];

  private constructor(data: {
    _id: ObjectId;
    riderId: ObjectId;
    status: RescueStatus;
    type: RescueType;
    pickupLocation: Location;
    dropoffLocation: Nullable<Location>;
    description: string;
    photos: string[];
    estimatedPrice: Money;
    finalPrice: Nullable<Money>;
    distance: Nullable<number>;
    estimatedDuration: Nullable<number>;
    bikeDetails: IBikeDetails;
    priority: RescuePriority;
    cancellationReason: Nullable<string>;
    cancelledBy: Nullable<ObjectId>;
    requestedAt: Date;
    matchedAt: Nullable<Date>;
    acceptedAt: Nullable<Date>;
    arrivedAt: Nullable<Date>;
    completedAt: Nullable<Date>;
    cancelledAt: Nullable<Date>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this._id = data._id;
    this.riderId = data.riderId;
    this.status = data.status;
    this.type = data.type;
    this.pickupLocation = data.pickupLocation;
    this.dropoffLocation = data.dropoffLocation;
    this.description = data.description;
    this.photos = data.photos;
    this.estimatedPrice = data.estimatedPrice;
    this.finalPrice = data.finalPrice;
    this.distance = data.distance;
    this.estimatedDuration = data.estimatedDuration;
    this.bikeDetails = data.bikeDetails;
    this.priority = data.priority;
    this.cancellationReason = data.cancellationReason;
    this.cancelledBy = data.cancelledBy;
    this.requestedAt = data.requestedAt;
    this.matchedAt = data.matchedAt;
    this.acceptedAt = data.acceptedAt;
    this.arrivedAt = data.arrivedAt;
    this.completedAt = data.completedAt;
    this.cancelledAt = data.cancelledAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Create a new Rescue Request
   */
  public static create(params: {
    riderId: ObjectId;
    type: RescueType;
    pickupLocation: Location;
    dropoffLocation: Nullable<Location>;
    description: string;
    bikeDetails: IBikeDetails;
    estimatedPrice: Money;
    priority?: RescuePriority;
  }): Rescue {
    // Validate required fields
    if (!params.description || params.description.trim().length === 0) {
      throw new ValidationError('Description is required');
    }

    if (params.description.length > 1000) {
      throw new ValidationError('Description cannot exceed 1000 characters');
    }

    // Create rescue
    const now = new Date();
    const rescue = new Rescue({
      _id: new ObjectId(),
      riderId: params.riderId,
      status: RescueStatus.REQUESTED,
      type: params.type,
      pickupLocation: params.pickupLocation,
      dropoffLocation: params.dropoffLocation,
      description: params.description.trim(),
      photos: [],
      estimatedPrice: params.estimatedPrice,
      finalPrice: null,
      distance: params.dropoffLocation
        ? params.pickupLocation.distanceTo(params.dropoffLocation)
        : null,
      estimatedDuration: null,
      bikeDetails: params.bikeDetails,
      priority: params.priority ?? RescuePriority.NORMAL,
      cancellationReason: null,
      cancelledBy: null,
      requestedAt: now,
      matchedAt: null,
      acceptedAt: null,
      arrivedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // TODO: Add RescueRequested domain event
    // rescue.addDomainEvent(new RescueRequestedEvent(rescue));

    return rescue;
  }

  /**
   * Transition to a new status
   */
  public transitionTo(newStatus: RescueStatus, userId?: ObjectId): void {
    if (!isValidTransition(this.status, newStatus)) {
      throw new BusinessRuleViolationError(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition from ${this.status} to ${newStatus}`,
        { currentStatus: this.status, newStatus },
      );
    }

    const previousStatus = this.status;
    this.status = newStatus;
    this.updatedAt = new Date();

    // Update timestamps based on status
    switch (newStatus) {
      case RescueStatus.MATCHED:
        this.matchedAt = new Date();
        break;
      case RescueStatus.ACCEPTED:
        this.acceptedAt = new Date();
        break;
      case RescueStatus.ARRIVED:
        this.arrivedAt = new Date();
        break;
      case RescueStatus.COMPLETED:
        this.completedAt = new Date();
        break;
      case RescueStatus.CANCELLED:
        this.cancelledAt = new Date();
        this.cancelledBy = userId ?? null;
        break;
    }

    // TODO: Add status change domain event
    // this.addDomainEvent(new RescueStatusChangedEvent(this, previousStatus, newStatus));
  }

  /**
   * Mark as matched with driver
   */
  public markAsMatched(): void {
    this.transitionTo(RescueStatus.MATCHED);
  }

  /**
   * Mark as accepted by driver
   */
  public markAsAccepted(): void {
    this.transitionTo(RescueStatus.ACCEPTED);
  }

  /**
   * Mark driver en route
   */
  public markDriverEnRoute(): void {
    this.transitionTo(RescueStatus.EN_ROUTE);
  }

  /**
   * Mark driver arrived
   */
  public markDriverArrived(): void {
    this.transitionTo(RescueStatus.ARRIVED);
  }

  /**
   * Mark rescue in progress
   */
  public markInProgress(): void {
    this.transitionTo(RescueStatus.IN_PROGRESS);
  }

  /**
   * Complete rescue
   */
  public complete(finalPrice: Money): void {
    if (!finalPrice.isPositive()) {
      throw new ValidationError('Final price must be positive');
    }

    this.finalPrice = finalPrice;
    this.transitionTo(RescueStatus.COMPLETED);

    // TODO: Add RescueCompleted domain event
    // this.addDomainEvent(new RescueCompletedEvent(this));
  }

  /**
   * Cancel rescue
   */
  public cancel(reason: string, cancelledBy: ObjectId): void {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Cancellation reason is required');
    }

    if (isTerminalStatus(this.status)) {
      throw new BusinessRuleViolationError(
        'CANNOT_CANCEL_TERMINAL_RESCUE',
        `Cannot cancel rescue in ${this.status} status`,
        { status: this.status },
      );
    }

    this.cancellationReason = reason.trim();
    this.transitionTo(RescueStatus.CANCELLED, cancelledBy);

    // TODO: Add RescueCancelled domain event
    // this.addDomainEvent(new RescueCancelledEvent(this, reason, cancelledBy));
  }

  /**
   * Add photo URL
   */
  public addPhoto(photoUrl: string): void {
    if (this.photos.length >= 10) {
      throw new BusinessRuleViolationError(
        'MAX_PHOTOS_REACHED',
        'Cannot add more than 10 photos',
      );
    }

    if (!photoUrl.startsWith('https://')) {
      throw new ValidationError('Photo URL must be HTTPS');
    }

    this.photos.push(photoUrl);
    this.updatedAt = new Date();
  }

  /**
   * Update estimated price
   */
  public updateEstimatedPrice(newPrice: Money): void {
    if (this.status !== RescueStatus.REQUESTED && this.status !== RescueStatus.MATCHED) {
      throw new BusinessRuleViolationError(
        'CANNOT_UPDATE_PRICE',
        'Cannot update price after rescue is accepted',
      );
    }

    this.estimatedPrice = newPrice;
    this.updatedAt = new Date();
  }

  /**
   * Calculate time since request
   */
  public getTimeElapsedSinceRequest(): number {
    return Date.now() - this.requestedAt.getTime();
  }

  /**
   * Check if rescue is active (not terminal)
   */
  public isActive(): boolean {
    return !isTerminalStatus(this.status);
  }

  /**
   * Check if rescue is completed
   */
  public isCompleted(): boolean {
    return this.status === RescueStatus.COMPLETED;
  }

  /**
   * Check if rescue is cancelled
   */
  public isCancelled(): boolean {
    return this.status === RescueStatus.CANCELLED;
  }

  /**
   * Get rescue duration (if completed)
   */
  public getDuration(): Nullable<number> {
    if (!this.completedAt || !this.requestedAt) {
      return null;
    }

    return this.completedAt.getTime() - this.requestedAt.getTime();
  }

  /**
   * Add domain event
   */
  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Get and clear domain events
   */
  public pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  /**
   * Check if has pending domain events
   */
  public hasDomainEvents(): boolean {
    return this.domainEvents.length > 0;
  }

  /**
   * Serialize to plain object
   */
  public toObject(): Record<string, unknown> {
    return {
      _id: this._id,
      riderId: this.riderId,
      status: this.status,
      type: this.type,
      pickupLocation: this.pickupLocation.toJSON(),
      dropoffLocation: this.dropoffLocation?.toJSON() ?? null,
      description: this.description,
      photos: this.photos,
      estimatedPrice: this.estimatedPrice.toJSON(),
      finalPrice: this.finalPrice?.toJSON() ?? null,
      distance: this.distance,
      estimatedDuration: this.estimatedDuration,
      bikeDetails: this.bikeDetails,
      priority: this.priority,
      cancellationReason: this.cancellationReason,
      cancelledBy: this.cancelledBy,
      requestedAt: this.requestedAt,
      matchedAt: this.matchedAt,
      acceptedAt: this.acceptedAt,
      arrivedAt: this.arrivedAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
