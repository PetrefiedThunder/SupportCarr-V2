import { ValidationError } from '../errors/DomainError';

/**
 * Email Value Object
 *
 * Represents a validated email address
 * Immutable value object that ensures email validity
 */
export class Email {
  private readonly value: string;

  private constructor(email: string) {
    this.value = email;
  }

  /**
   * Create Email from string
   * @param email - Email address
   * @returns Email instance
   * @throws ValidationError if invalid
   */
  public static create(email: string): Email {
    const normalized = this.normalize(email);

    if (!this.isValid(normalized)) {
      throw new ValidationError('Invalid email address format', { email });
    }

    return new Email(normalized);
  }

  /**
   * Normalize email address
   */
  private static normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Validate email format
   */
  private static isValid(email: string): boolean {
    // RFC 5322 compliant email regex (simplified)
    const emailRegex =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

    if (!emailRegex.test(email)) {
      return false;
    }

    // Additional validation: length check
    if (email.length > 254) {
      return false;
    }

    // Check local part (before @) length
    const [localPart, domain] = email.split('@');
    if (localPart.length > 64 || domain.length > 253) {
      return false;
    }

    return true;
  }

  /**
   * Get the email value
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Get domain part of email
   */
  public getDomain(): string {
    return this.value.split('@')[1] ?? '';
  }

  /**
   * Get local part of email (before @)
   */
  public getLocalPart(): string {
    return this.value.split('@')[0] ?? '';
  }

  /**
   * Mask email for privacy (e.g., j***@example.com)
   */
  public toMaskedString(): string {
    const [local, domain] = this.value.split('@');
    if (!local || !domain) return this.value;

    const maskedLocal = local.length > 1 ? `${local[0]}***` : '*';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Compare with another Email
   */
  public equals(other: Email): boolean {
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
