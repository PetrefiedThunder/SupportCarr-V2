import { z } from 'zod';

/**
 * Environment Variables Schema
 *
 * Validates all required environment variables at startup
 * Uses Zod for runtime type safety
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  MONGODB_URI: z.string().url(),
  MONGODB_DB_NAME: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex
  ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PLATFORM_FEE_PERCENT: z.string().transform(Number).default('20'),

  // Mapbox
  MAPBOX_ACCESS_TOKEN: z.string().min(1),

  // AWS S3 (for photo uploads)
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),

  // Sentry (Error Tracking)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // Observability
  ENABLE_METRICS: z.string().transform((v) => v === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // CORS
  CORS_ORIGINS: z.string().transform((v) => v.split(',')),

  // Frontend URL
  FRONTEND_URL: z.string().url(),

  // WebSocket
  WEBSOCKET_PORT: z.string().transform(Number).default('3001'),

  // BullMQ Workers
  WORKER_CONCURRENCY: z.string().transform(Number).default('5'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Feature Flags
  ENABLE_PHONE_VERIFICATION: z.string().transform((v) => v === 'true').default('true'),
  ENABLE_BACKGROUND_CHECKS: z.string().transform((v) => v === 'true').default('false'),

  // Pricing
  BASE_RESCUE_PRICE: z.string().transform(Number).default('2500'), // $25.00 in cents
  PRICE_PER_MILE: z.string().transform(Number).default('200'), // $2.00 per mile
  SURGE_MULTIPLIER_MAX: z.string().transform(Number).default('2.0'),

  // Driver Matching
  DRIVER_MATCH_RADIUS_MILES: z.string().transform(Number).default('10'),
  DRIVER_MATCH_TIMEOUT_MS: z.string().transform(Number).default('30000'), // 30 seconds
});

/**
 * Parsed and validated environment variables
 */
type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}\n\nPlease check your .env file.`,
      );
    }
    throw error;
  }
}

/**
 * Validated environment configuration
 */
export const env: Env = validateEnv();

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Get full database configuration
 */
export const getDatabaseConfig = () => ({
  uri: env.MONGODB_URI,
  dbName: env.MONGODB_DB_NAME,
  options: {
    maxPoolSize: 50,
    minPoolSize: 10,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    retryReads: true,
    w: 'majority' as const,
  },
});

/**
 * Get Redis configuration
 */
export const getRedisConfig = () => ({
  url: env.REDIS_URL,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

/**
 * Get JWT configuration
 */
export const getJWTConfig = () => ({
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  refreshSecret: env.JWT_REFRESH_SECRET,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
});

/**
 * Get Stripe configuration
 */
export const getStripeConfig = () => ({
  secretKey: env.STRIPE_SECRET_KEY,
  publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  platformFeePercent: env.STRIPE_PLATFORM_FEE_PERCENT,
});

/**
 * Get Twilio configuration
 */
export const getTwilioConfig = () => ({
  accountSid: env.TWILIO_ACCOUNT_SID,
  authToken: env.TWILIO_AUTH_TOKEN,
  phoneNumber: env.TWILIO_PHONE_NUMBER,
  verifyServiceSid: env.TWILIO_VERIFY_SERVICE_SID,
});
