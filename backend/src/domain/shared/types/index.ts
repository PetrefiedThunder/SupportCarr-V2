/**
 * Shared TypeScript types used across all bounded contexts
 */

import { Types } from 'mongoose';

/**
 * MongoDB ObjectId type
 */
export type ObjectId = Types.ObjectId;

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

/**
 * Optional type helper
 */
export type Optional<T> = T | undefined;

/**
 * Timestamp fields for all entities
 */
export interface ITimestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base entity interface
 */
export interface IEntity extends ITimestamps {
  _id: ObjectId;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
  readonly success = true;
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  static of<T>(value: T): Success<T> {
    return new Success(value);
  }
}

export class Failure<E = Error> {
  readonly success = false;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  static of<E>(error: E): Failure<E> {
    return new Failure(error);
  }
}

/**
 * Pagination parameters
 */
export interface IPaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * GeoJSON Point for locations
 */
export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Address interface
 */
export interface IAddress {
  street?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Location with address
 */
export interface ILocation {
  coordinates: IGeoPoint;
  address: IAddress;
  formattedAddress: string;
}

/**
 * User roles enum
 */
export enum UserRole {
  RIDER = 'rider',
  DRIVER = 'driver',
  ADMIN = 'admin',
  SUPPORT = 'support',
}

/**
 * Generic status enum
 */
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

/**
 * Type guard for checking if a value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if value is Success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard for checking if value is Failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}
