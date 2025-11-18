import { ObjectId, IEntity, Nullable } from '@shared/types';
import { BusinessRuleViolationError, ValidationError } from '@shared/errors/DomainError';
import { Location } from '@shared/value-objects/Location';
import { PhoneNumber } from '@shared/value-objects/PhoneNumber';
import { Email } from '@shared/value-objects/Email';

/**
 * Driver Status
 */
export enum DriverStatus {
  PENDING = 'pending',     // Application submitted, awaiting approval
  APPROVED = 'approved',   // Approved and can accept rescues
  SUSPENDED = 'suspended', // Temporarily suspended
  REJECTED = 'rejected',   // Application rejected
}

/**
 * Driver Entity
 *
 * Represents a driver who performs rescue services
 */
export class Driver implements IEntity {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  phoneNumber: PhoneNumber;
  email: Nullable<Email>;
  licenseNumber: string;
  licenseExpiry: Date;
  vehicleInsuranceNumber: Nullable<string>;
  insuranceExpiry: Nullable<Date>;
  stripeAccountId: Nullable<string>;
  location: Nullable<Location>;
  isOnline: boolean;
  isAvailable: boolean;
  status: DriverStatus;
  rating: number;
  ratingCount: number;
  completedRescues: number;
  totalEarnings: number; // in cents
  backgroundCheckDate: Nullable<Date>;
  lastLocationUpdate: Nullable<Date>;
  createdAt: Date;
  updatedAt: Date;

  private constructor(data: {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    phoneNumber: PhoneNumber;
    email: Nullable<Email>;
    licenseNumber: string;
    licenseExpiry: Date;
    vehicleInsuranceNumber: Nullable<string>;
    insuranceExpiry: Nullable<Date>;
    stripeAccountId: Nullable<string>;
    location: Nullable<Location>;
    isOnline: boolean;
    isAvailable: boolean;
    status: DriverStatus;
    rating: number;
    ratingCount: number;
    completedRescues: number;
    totalEarnings: number;
    backgroundCheckDate: Nullable<Date>;
    lastLocationUpdate: Nullable<Date>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this._id = data._id;
    this.userId = data.userId;
    this.name = data.name;
    this.phoneNumber = data.phoneNumber;
    this.email = data.email;
    this.licenseNumber = data.licenseNumber;
    this.licenseExpiry = data.licenseExpiry;
    this.vehicleInsuranceNumber = data.vehicleInsuranceNumber;
    this.insuranceExpiry = data.insuranceExpiry;
    this.stripeAccountId = data.stripeAccountId;
    this.location = data.location;
    this.isOnline = data.isOnline;
    this.isAvailable = data.isAvailable;
    this.status = data.status;
    this.rating = data.rating;
    this.ratingCount = data.ratingCount;
    this.completedRescues = data.completedRescues;
    this.totalEarnings = data.totalEarnings;
    this.backgroundCheckDate = data.backgroundCheckDate;
    this.lastLocationUpdate = data.lastLocationUpdate;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Create a new Driver profile
   */
  public static create(params: {
    userId: ObjectId;
    name: string;
    phoneNumber: PhoneNumber;
    email: Nullable<Email>;
    licenseNumber: string;
    licenseExpiry: Date;
    vehicleInsuranceNumber?: string;
    insuranceExpiry?: Date;
  }): Driver {
    // Validate name
    if (!params.name || params.name.trim().length === 0) {
      throw new ValidationError('Driver name is required');
    }

    if (params.name.length < 2 || params.name.length > 100) {
      throw new ValidationError('Driver name must be between 2 and 100 characters');
    }

    // Validate license
    if (!params.licenseNumber || params.licenseNumber.trim().length === 0) {
      throw new ValidationError('License number is required');
    }

    // Validate license expiry
    if (params.licenseExpiry <= new Date()) {
      throw new ValidationError('License must not be expired');
    }

    const now = new Date();
    return new Driver({
      _id: new ObjectId(),
      userId: params.userId,
      name: params.name.trim(),
      phoneNumber: params.phoneNumber,
      email: params.email,
      licenseNumber: params.licenseNumber.trim(),
      licenseExpiry: params.licenseExpiry,
      vehicleInsuranceNumber: params.vehicleInsuranceNumber ?? null,
      insuranceExpiry: params.insuranceExpiry ?? null,
      stripeAccountId: null,
      location: null,
      isOnline: false,
      isAvailable: false,
      status: DriverStatus.PENDING,
      rating: 5.0, // Start with perfect rating
      ratingCount: 0,
      completedRescues: 0,
      totalEarnings: 0,
      backgroundCheckDate: null,
      lastLocationUpdate: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Approve driver application
   */
  public approve(): void {
    if (this.status !== DriverStatus.PENDING) {
      throw new BusinessRuleViolationError(
        'CANNOT_APPROVE_DRIVER',
        `Cannot approve driver in ${this.status} status`,
      );
    }

    this.status = DriverStatus.APPROVED;
    this.updatedAt = new Date();
  }

  /**
   * Reject driver application
   */
  public reject(): void {
    if (this.status !== DriverStatus.PENDING) {
      throw new BusinessRuleViolationError(
        'CANNOT_REJECT_DRIVER',
        `Cannot reject driver in ${this.status} status`,
      );
    }

    this.status = DriverStatus.REJECTED;
    this.isOnline = false;
    this.isAvailable = false;
    this.updatedAt = new Date();
  }

  /**
   * Suspend driver
   */
  public suspend(): void {
    if (this.status !== DriverStatus.APPROVED) {
      throw new BusinessRuleViolationError(
        'CANNOT_SUSPEND_DRIVER',
        `Cannot suspend driver in ${this.status} status`,
      );
    }

    this.status = DriverStatus.SUSPENDED;
    this.isOnline = false;
    this.isAvailable = false;
    this.updatedAt = new Date();
  }

  /**
   * Reactivate suspended driver
   */
  public reactivate(): void {
    if (this.status !== DriverStatus.SUSPENDED) {
      throw new BusinessRuleViolationError(
        'CANNOT_REACTIVATE_DRIVER',
        `Cannot reactivate driver in ${this.status} status`,
      );
    }

    this.status = DriverStatus.APPROVED;
    this.updatedAt = new Date();
  }

  /**
   * Go online
   */
  public goOnline(): void {
    if (this.status !== DriverStatus.APPROVED) {
      throw new BusinessRuleViolationError(
        'DRIVER_NOT_APPROVED',
        'Only approved drivers can go online',
      );
    }

    if (!this.location) {
      throw new BusinessRuleViolationError(
        'LOCATION_REQUIRED',
        'Driver location must be set before going online',
      );
    }

    this.isOnline = true;
    this.updatedAt = new Date();
  }

  /**
   * Go offline
   */
  public goOffline(): void {
    this.isOnline = false;
    this.isAvailable = false;
    this.updatedAt = new Date();
  }

  /**
   * Mark as available for rescues
   */
  public markAvailable(): void {
    if (!this.isOnline) {
      throw new BusinessRuleViolationError(
        'DRIVER_NOT_ONLINE',
        'Driver must be online to mark as available',
      );
    }

    this.isAvailable = true;
    this.updatedAt = new Date();
  }

  /**
   * Mark as unavailable (busy with rescue)
   */
  public markUnavailable(): void {
    this.isAvailable = false;
    this.updatedAt = new Date();
  }

  /**
   * Update driver location
   */
  public updateLocation(location: Location): void {
    this.location = location;
    this.lastLocationUpdate = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Record completed rescue
   */
  public recordCompletedRescue(earnings: number): void {
    if (earnings < 0) {
      throw new ValidationError('Earnings cannot be negative');
    }

    this.completedRescues += 1;
    this.totalEarnings += earnings;
    this.updatedAt = new Date();
  }

  /**
   * Add rating
   */
  public addRating(newRating: number): void {
    if (newRating < 1 || newRating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    // Calculate new average rating
    const totalRating = this.rating * this.ratingCount;
    this.ratingCount += 1;
    this.rating = (totalRating + newRating) / this.ratingCount;
    this.updatedAt = new Date();
  }

  /**
   * Set Stripe account ID
   */
  public setStripeAccountId(stripeAccountId: string): void {
    if (!stripeAccountId || stripeAccountId.trim().length === 0) {
      throw new ValidationError('Stripe account ID is required');
    }

    this.stripeAccountId = stripeAccountId.trim();
    this.updatedAt = new Date();
  }

  /**
   * Record background check
   */
  public recordBackgroundCheck(checkDate: Date): void {
    this.backgroundCheckDate = checkDate;
    this.updatedAt = new Date();
  }

  /**
   * Check if driver can accept rescues
   */
  public canAcceptRescues(): boolean {
    return (
      this.status === DriverStatus.APPROVED &&
      this.isOnline &&
      this.isAvailable &&
      this.location !== null
    );
  }

  /**
   * Check if license is valid
   */
  public hasValidLicense(): boolean {
    return this.licenseExpiry > new Date();
  }

  /**
   * Check if insurance is valid
   */
  public hasValidInsurance(): boolean {
    if (!this.insuranceExpiry) return false;
    return this.insuranceExpiry > new Date();
  }

  /**
   * Get acceptance rate (placeholder - would calculate from assignments)
   */
  public getAcceptanceRate(): number {
    // TODO: Calculate from assignment history
    return 0.95; // 95% placeholder
  }

  /**
   * Get completion rate
   */
  public getCompletionRate(): number {
    // TODO: Calculate from rescue history
    return 0.98; // 98% placeholder
  }

  /**
   * Calculate distance to location
   */
  public distanceTo(location: Location): number {
    if (!this.location) {
      throw new BusinessRuleViolationError(
        'NO_LOCATION',
        'Driver location not set',
      );
    }

    return this.location.distanceTo(location);
  }

  /**
   * Serialize to plain object
   */
  public toObject(): Record<string, unknown> {
    return {
      _id: this._id,
      userId: this.userId,
      name: this.name,
      phoneNumber: this.phoneNumber.getValue(),
      email: this.email?.getValue() ?? null,
      licenseNumber: this.licenseNumber,
      licenseExpiry: this.licenseExpiry,
      vehicleInsuranceNumber: this.vehicleInsuranceNumber,
      insuranceExpiry: this.insuranceExpiry,
      stripeAccountId: this.stripeAccountId,
      location: this.location?.toJSON() ?? null,
      isOnline: this.isOnline,
      isAvailable: this.isAvailable,
      status: this.status,
      rating: this.rating,
      ratingCount: this.ratingCount,
      completedRescues: this.completedRescues,
      totalEarnings: this.totalEarnings,
      backgroundCheckDate: this.backgroundCheckDate,
      lastLocationUpdate: this.lastLocationUpdate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
