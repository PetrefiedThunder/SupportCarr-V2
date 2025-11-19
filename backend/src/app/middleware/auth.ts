import { Request, Response, NextFunction } from 'express';
import { JWTService } from '@infrastructure/security/jwt/JWTService';
import { logger } from '@infrastructure/observability/logger/Logger';

/**
 * Authenticated User Interface
 */
export interface IAuthenticatedUser {
  userId: string;
  phoneNumber: string;
  role: 'rider' | 'driver';
}

/**
 * Extend Express Request with user
 */
declare global {
  namespace Express {
    interface Request {
      user?: IAuthenticatedUser;
    }
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends Error {
  public readonly statusCode = 401;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends Error {
  public readonly statusCode = 403;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Authenticate JWT Middleware
 *
 * Verifies JWT token and attaches user to request
 */
export function authenticate(jwtService: JWTService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new AuthenticationError('No authorization header provided');
      }

      const parts = authHeader.split(' ');

      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AuthenticationError('Invalid authorization header format');
      }

      const token = parts[1];

      // Verify token
      const payload = jwtService.verifyAccessToken(token);

      // Attach user to request
      req.user = {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber,
        role: payload.role as 'rider' | 'driver',
      };

      logger.debug('User authenticated', { userId: req.user.userId });

      next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('expired')) {
        next(new AuthenticationError('Token expired'));
      } else if (error instanceof Error && error.message.includes('invalid')) {
        next(new AuthenticationError('Invalid token'));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Require Role Middleware
 *
 * Ensures user has required role
 */
export function requireRole(...roles: Array<'rider' | 'driver'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `This endpoint requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
    }

    next();
  };
}
