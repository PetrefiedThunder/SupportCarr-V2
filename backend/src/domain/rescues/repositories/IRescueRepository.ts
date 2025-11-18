import { Rescue } from '../entities/Rescue';
import { ObjectId, IPaginationParams, IPaginatedResult, Nullable } from '@shared/types';
import { RescueStatus } from '../value-objects/RescueStatus';
import { Location } from '@shared/value-objects/Location';

/**
 * Rescue Repository Interface
 *
 * Defines the contract for rescue persistence operations.
 * Implementation will be in the infrastructure layer (MongoRescueRepository).
 *
 * This interface ensures the domain layer is decoupled from infrastructure.
 */
export interface IRescueRepository {
  /**
   * Save a rescue (create or update)
   */
  save(rescue: Rescue): Promise<Rescue>;

  /**
   * Find rescue by ID
   */
  findById(id: ObjectId): Promise<Nullable<Rescue>>;

  /**
   * Find rescue by ID or throw
   */
  findByIdOrFail(id: ObjectId): Promise<Rescue>;

  /**
   * Find rescues by rider ID
   */
  findByRiderId(riderId: ObjectId, pagination?: IPaginationParams): Promise<IPaginatedResult<Rescue>>;

  /**
   * Find active rescues by rider ID
   */
  findActiveByRiderId(riderId: ObjectId): Promise<Rescue[]>;

  /**
   * Find rescues by status
   */
  findByStatus(status: RescueStatus, pagination?: IPaginationParams): Promise<IPaginatedResult<Rescue>>;

  /**
   * Find rescues near a location
   * Used for driver matching
   */
  findNearLocation(
    location: Location,
    radiusInMiles: number,
    statuses: RescueStatus[],
    limit?: number,
  ): Promise<Rescue[]>;

  /**
   * Find rescue by assignment (if driver is assigned)
   */
  findByAssignment(rescueId: ObjectId): Promise<Nullable<Rescue>>;

  /**
   * Count rescues by rider
   */
  countByRiderId(riderId: ObjectId): Promise<number>;

  /**
   * Count rescues by status
   */
  countByStatus(status: RescueStatus): Promise<number>;

  /**
   * Find rescues created within date range
   */
  findByDateRange(startDate: Date, endDate: Date, pagination?: IPaginationParams): Promise<IPaginatedResult<Rescue>>;

  /**
   * Delete rescue (soft delete - mark as cancelled)
   */
  delete(id: ObjectId): Promise<void>;

  /**
   * Check if rider has active rescue
   */
  hasActiveRescue(riderId: ObjectId): Promise<boolean>;

  /**
   * Get rescue statistics for analytics
   */
  getStatistics(params: {
    startDate?: Date;
    endDate?: Date;
    riderId?: ObjectId;
    status?: RescueStatus;
  }): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    averageDuration: number;
    averagePrice: number;
  }>;

  /**
   * Batch save rescues (for bulk operations)
   */
  saveMany(rescues: Rescue[]): Promise<Rescue[]>;
}

/**
 * Rescue query filters
 */
export interface IRescueFilters {
  riderId?: ObjectId;
  status?: RescueStatus | RescueStatus[];
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
}
