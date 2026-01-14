import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validation Error Response
 */
export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Validate Request with Zod Schema
 *
 * Middleware factory for validating request bodies, queries, and params
 */
export function validateRequest(schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: Array<{ field: string; message: string }> = [];

      // Validate body
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            errors.push({
              field: issue.path.join('.'),
              message: issue.message,
            });
          });
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            errors.push({
              field: `query.${issue.path.join('.')}`,
              message: issue.message,
            });
          });
        } else {
          req.query = result.data as any;
        }
      }

      // Validate params
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            errors.push({
              field: `params.${issue.path.join('.')}`,
              message: issue.message,
            });
          });
        } else {
          req.params = result.data as any;
        }
      }

      if (errors.length > 0) {
        throw new ValidationError(errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
