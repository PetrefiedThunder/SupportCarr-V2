import jwt from 'jsonwebtoken';
import { ObjectId } from '@shared/types';
import { UserRole } from '@shared/types';
import { UnauthorizedError } from '@shared/errors/DomainError';
import { getJWTConfig } from '@config/env';

/**
 * JWT Payload
 */
export interface IJWTPayload {
  userId: string;
  role: UserRole;
  phoneNumber: string;
}

/**
 * JWT Tokens Pair
 */
export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT Service
 *
 * Handles creation and verification of JSON Web Tokens
 * Supports both access tokens (short-lived) and refresh tokens (long-lived)
 */
export class JWTService {
  private readonly config = getJWTConfig();

  /**
   * Generate access token
   *
   * @param userId - User ID
   * @param role - User role
   * @param phoneNumber - User phone number
   * @returns Signed JWT access token
   */
  public generateAccessToken(userId: ObjectId, role: UserRole, phoneNumber: string): string {
    const payload: IJWTPayload = {
      userId: userId.toString(),
      role,
      phoneNumber,
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.expiresIn,
      issuer: 'supportcarr',
      audience: 'supportcarr-api',
    });
  }

  /**
   * Generate refresh token
   *
   * @param userId - User ID
   * @returns Signed JWT refresh token
   */
  public generateRefreshToken(userId: ObjectId): string {
    const payload = {
      userId: userId.toString(),
      type: 'refresh',
    };

    return jwt.sign(payload, this.config.refreshSecret, {
      expiresIn: this.config.refreshExpiresIn,
      issuer: 'supportcarr',
      audience: 'supportcarr-api',
    });
  }

  /**
   * Generate both access and refresh tokens
   *
   * @param userId - User ID
   * @param role - User role
   * @param phoneNumber - User phone number
   * @returns Token pair
   */
  public generateTokenPair(userId: ObjectId, role: UserRole, phoneNumber: string): ITokenPair {
    return {
      accessToken: this.generateAccessToken(userId, role, phoneNumber),
      refreshToken: this.generateRefreshToken(userId),
    };
  }

  /**
   * Verify access token
   *
   * @param token - JWT access token
   * @returns Decoded payload
   * @throws UnauthorizedError if token is invalid
   */
  public verifyAccessToken(token: string): IJWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: 'supportcarr',
        audience: 'supportcarr-api',
      }) as IJWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Verify refresh token
   *
   * @param token - JWT refresh token
   * @returns User ID
   * @throws UnauthorizedError if token is invalid
   */
  public verifyRefreshToken(token: string): string {
    try {
      const decoded = jwt.verify(token, this.config.refreshSecret, {
        issuer: 'supportcarr',
        audience: 'supportcarr-api',
      }) as { userId: string; type: string };

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return decoded.userId;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Decode token without verification (for debugging)
   *
   * @param token - JWT token
   * @returns Decoded payload or null
   */
  public decode(token: string): IJWTPayload | null {
    try {
      return jwt.decode(token) as IJWTPayload | null;
    } catch {
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns Token string
   * @throws UnauthorizedError if header is invalid
   */
  public extractTokenFromHeader(authHeader?: string): string {
    if (!authHeader) {
      throw new UnauthorizedError('Authorization header missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format. Expected: Bearer <token>');
    }

    return parts[1]!;
  }

  /**
   * Get token expiration time
   *
   * @param token - JWT token
   * @returns Expiration timestamp or null
   */
  public getTokenExpiration(token: string): number | null {
    const decoded = this.decode(token);
    return decoded && 'exp' in decoded ? (decoded.exp as number) : null;
  }

  /**
   * Check if token is expired (without verification)
   *
   * @param token - JWT token
   * @returns True if expired
   */
  public isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiration(token);
    if (!exp) return true;

    return Date.now() >= exp * 1000;
  }
}

/**
 * Singleton instance
 */
export const jwtService = new JWTService();
