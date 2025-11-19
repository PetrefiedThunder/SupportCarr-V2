import crypto from 'crypto';
import { env } from '@config/env';

/**
 * Field-Level Encryption Service
 *
 * Provides AES-256-GCM encryption for PII fields in the database
 * Uses authenticated encryption to prevent tampering
 */
export class FieldEncryption {
  private readonly algorithm: string;
  private readonly key: Buffer;

  constructor() {
    this.algorithm = env.ENCRYPTION_ALGORITHM;
    this.key = Buffer.from(env.ENCRYPTION_KEY, 'hex');

    // Validate key length for AES-256
    if (this.key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters) for AES-256');
    }
  }

  /**
   * Encrypt a string value
   *
   * @param plaintext - The text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (all hex)
   */
  public encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    try {
      // Generate random IV (Initialization Vector)
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag (for GCM mode)
      const authTag = cipher.getAuthTag();

      // Return format: iv:authTag:ciphertext
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt a string value
   *
   * @param encrypted - The encrypted string in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext
   */
  public decrypt(encrypted: string): string {
    if (!encrypted || typeof encrypted !== 'string') {
      return encrypted;
    }

    try {
      // Parse the encrypted string
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, ciphertext] = parts;

      // Convert from hex
      const iv = Buffer.from(ivHex!, 'hex');
      const authTag = Buffer.from(authTagHex!, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(ciphertext!, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Encrypt an object (encrypts all string values)
   *
   * @param obj - Object to encrypt
   * @returns Object with encrypted string values
   */
  public encryptObject<T extends Record<string, unknown>>(obj: T): T {
    const encrypted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        encrypted[key] = this.encrypt(value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        encrypted[key] = this.encryptObject(value as Record<string, unknown>);
      } else {
        encrypted[key] = value;
      }
    }

    return encrypted as T;
  }

  /**
   * Decrypt an object (decrypts all string values)
   *
   * @param obj - Object to decrypt
   * @returns Object with decrypted string values
   */
  public decryptObject<T extends Record<string, unknown>>(obj: T): T {
    const decrypted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        try {
          decrypted[key] = this.decrypt(value);
        } catch {
          // If decryption fails, assume it's not encrypted
          decrypted[key] = value;
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        decrypted[key] = this.decryptObject(value as Record<string, unknown>);
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted as T;
  }

  /**
   * Hash a value (one-way, for searching)
   *
   * Note: Use this when you need to search encrypted fields
   * Store both encrypted value (for retrieval) and hash (for searching)
   *
   * @param value - Value to hash
   * @returns SHA-256 hash (hex)
   */
  public hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a new encryption key (for key rotation)
   *
   * @returns 32-byte key as hex string
   */
  public static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Singleton instance
 */
export const fieldEncryption = new FieldEncryption();
