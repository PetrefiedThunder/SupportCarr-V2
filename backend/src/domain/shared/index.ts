/**
 * Shared Domain Exports
 *
 * This module exports all shared domain components that are used
 * across multiple bounded contexts.
 */

// Types
export * from './types';

// Value Objects
export { PhoneNumber } from './value-objects/PhoneNumber';
export { Email } from './value-objects/Email';
export { Money, Currency } from './value-objects/Money';
export { Location } from './value-objects/Location';

// Errors
export * from './errors/DomainError';

// Events
export * from './events/DomainEvent';
