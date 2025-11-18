import { ValidationError } from '../errors/DomainError';

/**
 * PhoneNumber Value Object
 *
 * Represents a validated phone number in E.164 format (+1234567890)
 * Immutable value object that ensures phone number validity
 */
export class PhoneNumber {
  private readonly value: string;

  private constructor(phoneNumber: string) {
    this.value = phoneNumber;
  }

  /**
   * Create PhoneNumber from string
   * @param phoneNumber - Phone number in E.164 format
   * @returns PhoneNumber instance
   * @throws ValidationError if invalid
   */
  public static create(phoneNumber: string): PhoneNumber {
    const normalized = this.normalize(phoneNumber);

    if (!this.isValid(normalized)) {
      throw new ValidationError('Invalid phone number format. Expected E.164 format (+1234567890)', {
        phoneNumber,
      });
    }

    return new PhoneNumber(normalized);
  }

  /**
   * Normalize phone number to E.164 format
   */
  private static normalize(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');

    // If starts with country code without +, add it
    if (!normalized.startsWith('+')) {
      // Assume US number if no country code
      if (normalized.length === 10) {
        normalized = `+1${normalized}`;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = `+${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    return normalized;
  }

  /**
   * Validate E.164 format
   */
  private static isValid(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    // Length: 1-15 digits (excluding +)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Get the phone number value
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Get formatted phone number (US format)
   */
  public toFormattedString(): string {
    // For US numbers (+1XXXXXXXXXX)
    if (this.value.startsWith('+1') && this.value.length === 12) {
      const digits = this.value.slice(2);
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // For other countries, return as-is
    return this.value;
  }

  /**
   * Get national format (without country code)
   */
  public toNationalFormat(): string {
    // Remove country code
    if (this.value.startsWith('+1')) {
      return this.value.slice(2);
    }

    // For other countries, remove + and first 1-3 digits
    return this.value.slice(1).replace(/^\d{1,3}/, '');
  }

  /**
   * Compare with another PhoneNumber
   */
  public equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.value;
  }

  /**
   * JSON serialization
   */
  public toJSON(): string {
    return this.value;
  }
}
