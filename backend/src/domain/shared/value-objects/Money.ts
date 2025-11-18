import { ValidationError } from '../errors/DomainError';

/**
 * Currency enum
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
}

/**
 * Money Value Object
 *
 * Represents a monetary amount with currency
 * Stores amount in cents to avoid floating-point precision issues
 * Immutable value object
 */
export class Money {
  private readonly amountInCents: number;
  private readonly currency: Currency;

  private constructor(amountInCents: number, currency: Currency) {
    this.amountInCents = amountInCents;
    this.currency = currency;
  }

  /**
   * Create Money from cents
   * @param amountInCents - Amount in cents (integer)
   * @param currency - Currency code
   */
  public static fromCents(amountInCents: number, currency: Currency = Currency.USD): Money {
    if (!Number.isInteger(amountInCents)) {
      throw new ValidationError('Amount in cents must be an integer', { amountInCents });
    }

    if (amountInCents < 0) {
      throw new ValidationError('Amount cannot be negative', { amountInCents });
    }

    return new Money(amountInCents, currency);
  }

  /**
   * Create Money from dollars
   * @param amountInDollars - Amount in dollars (can be decimal)
   * @param currency - Currency code
   */
  public static fromDollars(amountInDollars: number, currency: Currency = Currency.USD): Money {
    if (amountInDollars < 0) {
      throw new ValidationError('Amount cannot be negative', { amountInDollars });
    }

    const amountInCents = Math.round(amountInDollars * 100);
    return new Money(amountInCents, currency);
  }

  /**
   * Create zero Money
   */
  public static zero(currency: Currency = Currency.USD): Money {
    return new Money(0, currency);
  }

  /**
   * Get amount in cents
   */
  public toCents(): number {
    return this.amountInCents;
  }

  /**
   * Get amount in dollars
   */
  public toDollars(): number {
    return this.amountInCents / 100;
  }

  /**
   * Get currency
   */
  public getCurrency(): Currency {
    return this.currency;
  }

  /**
   * Add two Money objects
   */
  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountInCents + other.amountInCents, this.currency);
  }

  /**
   * Subtract two Money objects
   */
  public subtract(other: Money): Money {
    this.assertSameCurrency(other);

    const result = this.amountInCents - other.amountInCents;
    if (result < 0) {
      throw new ValidationError('Cannot subtract: result would be negative', {
        current: this.amountInCents,
        subtract: other.amountInCents,
      });
    }

    return new Money(result, this.currency);
  }

  /**
   * Multiply by a factor
   */
  public multiply(factor: number): Money {
    if (factor < 0) {
      throw new ValidationError('Cannot multiply by negative factor', { factor });
    }

    const result = Math.round(this.amountInCents * factor);
    return new Money(result, this.currency);
  }

  /**
   * Divide by a divisor
   */
  public divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new ValidationError('Cannot divide by zero or negative number', { divisor });
    }

    const result = Math.round(this.amountInCents / divisor);
    return new Money(result, this.currency);
  }

  /**
   * Calculate percentage
   */
  public percentage(percent: number): Money {
    if (percent < 0 || percent > 100) {
      throw new ValidationError('Percentage must be between 0 and 100', { percent });
    }

    const result = Math.round((this.amountInCents * percent) / 100);
    return new Money(result, this.currency);
  }

  /**
   * Check if amount is zero
   */
  public isZero(): boolean {
    return this.amountInCents === 0;
  }

  /**
   * Check if amount is positive
   */
  public isPositive(): boolean {
    return this.amountInCents > 0;
  }

  /**
   * Compare amounts
   */
  public isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInCents > other.amountInCents;
  }

  public isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInCents < other.amountInCents;
  }

  public equals(other: Money): boolean {
    return this.amountInCents === other.amountInCents && this.currency === other.currency;
  }

  /**
   * Assert same currency
   */
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new ValidationError('Cannot operate on different currencies', {
        currency1: this.currency,
        currency2: other.currency,
      });
    }
  }

  /**
   * Format as currency string
   */
  public toFormattedString(): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(this.toDollars());
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.toFormattedString();
  }

  /**
   * JSON serialization
   */
  public toJSON(): { amountInCents: number; currency: Currency } {
    return {
      amountInCents: this.amountInCents,
      currency: this.currency,
    };
  }
}
