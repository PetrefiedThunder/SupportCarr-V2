import { Driver, DriverStatus } from '../entities/Driver';
import { ObjectId, IPaginationParams, IPaginatedResult, Nullable } from '@shared/types';
import { Location } from '@shared/value-objects/Location';

/**
 * Driver Repository Interface
 *
 * Defines the contract for driver persistence operations
 */
export interface IDriverRepository {
  /**
   * Save a driver (create or update)
   */
  save(driver: Driver): Promise<Driver>;

  /**
   * Find driver by ID
   */
  findById(id: ObjectId): Promise<Nullable<Driver>>;

  /**
   * Find driver by ID or throw
   */
  findByIdOrFail(id: ObjectId): Promise<Driver>;

  /**
   * Find driver by user ID
   */
  findByUserId(userId: ObjectId): Promise<Nullable<Driver>>;

  /**
   * Find drivers by status
   */
  findByStatus(status: DriverStatus, pagination?: IPaginationParams): Promise<IPaginatedResult<Driver>>;

  /**
   * Find available drivers near a location
   * Critical for driver matching algorithm
   */
  findAvailableNearLocation(
    location: Location,
    radiusInMiles: number,
    limit?: number,
  ): Promise<Driver[]>;

  /**
   * Find online drivers (for admin dashboard)
   */
  findOnlineDrivers(pagination?: IPaginationParams): Promise<IPaginatedResult<Driver>>;

  /**
   * Count drivers by status
   */
  countByStatus(status: DriverStatus): Promise<number>;

  /**
   * Find top-rated drivers
   */
  findTopRated(limit: number): Promise<Driver[]>;

  /**
   * Find drivers needing background check renewal
   */
  findNeedingBackgroundCheck(beforeDate: Date): Promise<Driver[]>;

  /**
   * Find drivers with expiring licenses
   */
  findWithExpiringLicense(beforeDate: Date): Promise<Driver[]>;

  /**
   * Update driver location (optimized for frequent updates)
   */
  updateLocation(driverId: ObjectId, location: Location): Promise<void>;

  /**
   * Batch update driver availability
   */
  updateAvailability(driverId: ObjectId, isAvailable: boolean): Promise<void>;

  /**
   * Get driver statistics
   */
  getStatistics(driverId: ObjectId): Promise<{
    completedRescues: number;
    totalEarnings: number;
    rating: number;
    ratingCount: number;
    acceptanceRate: number;
    completionRate: number;
  }>;

  /**
   * Delete driver (hard delete - use with caution)
   */
  delete(id: ObjectId): Promise<void>;
}
