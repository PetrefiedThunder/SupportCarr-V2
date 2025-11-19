import { ObjectId } from '../types';

/**
 * Base Domain Event
 *
 * All domain events should extend this class. Domain events represent
 * something that happened in the domain that other parts of the system
 * might care about.
 *
 * Events are immutable and contain all data needed for event handlers.
 */
export abstract class DomainEvent {
  /**
   * Unique event ID
   */
  public readonly eventId: string;

  /**
   * Event name (e.g., 'RescueRequested', 'DriverAssigned')
   */
  public readonly eventName: string;

  /**
   * When the event occurred
   */
  public readonly occurredAt: Date;

  /**
   * Aggregate ID that emitted this event
   */
  public readonly aggregateId: ObjectId;

  /**
   * Aggregate type (e.g., 'Rescue', 'Driver')
   */
  public readonly aggregateType: string;

  /**
   * User who triggered this event (if applicable)
   */
  public readonly userId?: ObjectId;

  /**
   * Event version for schema evolution
   */
  public readonly version: number;

  constructor(
    eventName: string,
    aggregateId: ObjectId,
    aggregateType: string,
    userId?: ObjectId,
    version: number = 1,
  ) {
    this.eventId = this.generateEventId();
    this.eventName = eventName;
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.userId = userId;
    this.version = version;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Serialize event for storage/transmission
   */
  public toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId.toString(),
      aggregateType: this.aggregateType,
      userId: this.userId?.toString(),
      version: this.version,
      ...this.getPayload(),
    };
  }

  /**
   * Get event payload (to be implemented by subclasses)
   */
  protected abstract getPayload(): Record<string, unknown>;
}

/**
 * Event Handler Interface
 */
export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Event Bus Interface
 *
 * Defines the contract for publishing and subscribing to domain events
 */
export interface IEventBus {
  /**
   * Publish an event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple events
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to an event
   */
  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: IEventHandler<T>,
  ): void;

  /**
   * Unsubscribe from an event
   */
  unsubscribe<T extends DomainEvent>(
    eventName: string,
    handler: IEventHandler<T>,
  ): void;
}
