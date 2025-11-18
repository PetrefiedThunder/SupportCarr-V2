/**
 * Base Domain Error Class
 *
 * All domain errors should extend this class. Domain errors represent
 * business rule violations or invalid operations within the domain.
 */
export abstract class DomainError extends Error {
  /**
   * Error code for categorization
   */
  public readonly code: string;

  /**
   * HTTP status code hint (for API layer)
   */
  public readonly statusCode: number;

  /**
   * Additional context data
   */
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the prototype explicitly to support instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialize error for logging
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Validation Error - thrown when domain entity validation fails
 */
export class ValidationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
  }
}

/**
 * Not Found Error - thrown when an entity is not found
 */
export class NotFoundError extends DomainError {
  constructor(entityName: string, identifier: string) {
    super(
      `${entityName} with identifier '${identifier}' not found`,
      'NOT_FOUND',
      404,
      { entityName, identifier },
    );
  }
}

/**
 * Conflict Error - thrown when an operation conflicts with existing state
 */
export class ConflictError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, context);
  }
}

/**
 * Unauthorized Error - thrown when user is not authenticated
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Forbidden Error - thrown when user lacks permissions
 */
export class ForbiddenError extends DomainError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

/**
 * Business Rule Violation Error
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(rule: string, message: string, context?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, { rule, ...context });
  }
}

/**
 * External Service Error - thrown when external service fails
 */
export class ExternalServiceError extends DomainError {
  constructor(service: string, message: string, context?: Record<string, unknown>) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, {
      service,
      ...context,
    });
  }
}

/**
 * Infrastructure Error - thrown when infrastructure layer fails
 */
export class InfrastructureError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INFRASTRUCTURE_ERROR', 500, context);
  }
}
