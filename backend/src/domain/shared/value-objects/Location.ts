import { ValidationError } from '../errors/DomainError';
import { IAddress, IGeoPoint } from '../types';

/**
 * Location Value Object
 *
 * Represents a geographic location with coordinates and address
 * Immutable value object
 */
export class Location {
  private readonly coordinates: IGeoPoint;
  private readonly address: IAddress;
  private readonly formattedAddress: string;

  private constructor(coordinates: IGeoPoint, address: IAddress, formattedAddress: string) {
    this.coordinates = coordinates;
    this.address = address;
    this.formattedAddress = formattedAddress;
  }

  /**
   * Create Location from coordinates and address
   */
  public static create(
    longitude: number,
    latitude: number,
    address: IAddress,
    formattedAddress?: string,
  ): Location {
    // Validate coordinates
    if (!this.isValidLongitude(longitude)) {
      throw new ValidationError('Invalid longitude. Must be between -180 and 180', { longitude });
    }

    if (!this.isValidLatitude(latitude)) {
      throw new ValidationError('Invalid latitude. Must be between -90 and 90', { latitude });
    }

    // Validate address
    if (!address.city || !address.state || !address.country) {
      throw new ValidationError('Address must include city, state, and country', { address });
    }

    const coordinates: IGeoPoint = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    const formatted =
      formattedAddress || this.formatAddress(address, coordinates.coordinates[1], coordinates.coordinates[0]);

    return new Location(coordinates, address, formatted);
  }

  /**
   * Create from GeoJSON Point and address
   */
  public static fromGeoJSON(geoPoint: IGeoPoint, address: IAddress): Location {
    const [longitude, latitude] = geoPoint.coordinates;
    return this.create(longitude, latitude, address);
  }

  /**
   * Validate longitude
   */
  private static isValidLongitude(longitude: number): boolean {
    return longitude >= -180 && longitude <= 180;
  }

  /**
   * Validate latitude
   */
  private static isValidLatitude(latitude: number): boolean {
    return latitude >= -90 && latitude <= 90;
  }

  /**
   * Format address as string
   */
  private static formatAddress(address: IAddress, latitude: number, longitude: number): string {
    const parts: string[] = [];

    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);
    if (address.country) parts.push(address.country);

    if (parts.length === 0) {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    return parts.join(', ');
  }

  /**
   * Get GeoJSON coordinates
   */
  public getCoordinates(): IGeoPoint {
    return { ...this.coordinates };
  }

  /**
   * Get longitude
   */
  public getLongitude(): number {
    return this.coordinates.coordinates[0];
  }

  /**
   * Get latitude
   */
  public getLatitude(): number {
    return this.coordinates.coordinates[1];
  }

  /**
   * Get address
   */
  public getAddress(): IAddress {
    return { ...this.address };
  }

  /**
   * Get formatted address string
   */
  public getFormattedAddress(): string {
    return this.formattedAddress;
  }

  /**
   * Calculate distance to another location (Haversine formula)
   * Returns distance in miles
   */
  public distanceTo(other: Location): number {
    const R = 3959; // Earth's radius in miles
    const lat1 = this.toRadians(this.getLatitude());
    const lat2 = this.toRadians(other.getLatitude());
    const deltaLat = this.toRadians(other.getLatitude() - this.getLatitude());
    const deltaLon = this.toRadians(other.getLongitude() - this.getLongitude());

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if location is within radius of another location
   * @param center - Center location
   * @param radiusInMiles - Radius in miles
   */
  public isWithinRadius(center: Location, radiusInMiles: number): boolean {
    return this.distanceTo(center) <= radiusInMiles;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Compare with another Location
   */
  public equals(other: Location): boolean {
    return (
      this.getLongitude() === other.getLongitude() &&
      this.getLatitude() === other.getLatitude() &&
      this.formattedAddress === other.formattedAddress
    );
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.formattedAddress;
  }

  /**
   * JSON serialization
   */
  public toJSON(): {
    coordinates: IGeoPoint;
    address: IAddress;
    formattedAddress: string;
  } {
    return {
      coordinates: this.coordinates,
      address: this.address,
      formattedAddress: this.formattedAddress,
    };
  }
}
