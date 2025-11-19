import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  app: {
    name: process.env.APP_NAME || 'SupportCarr',
    url: process.env.APP_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/supportcarr',
    testUri: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/supportcarr_test',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  jwt: {
    secret: (() => {
      if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
      }
      return process.env.JWT_SECRET || 'dev-only-jwt-secret-change-in-prod';
    })(),
    refreshSecret: (() => {
      if (!process.env.JWT_REFRESH_SECRET && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_REFRESH_SECRET must be set in production');
      }
      return process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret-change-in-prod';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  encryption: {
    key: (() => {
      if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY must be set in production');
      }
      if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
      }
      return process.env.ENCRYPTION_KEY || 'dev-only-32-char-encryption!!';
    })(),
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    platformFeePercent: parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT) || 20,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'supportcarr-uploads',
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'SupportCarr <noreply@supportcarr.com>',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN,
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
    projectId: process.env.FCM_PROJECT_ID,
  },
  business: {
    maxDriverSearchRadiusKm: parseInt(process.env.MAX_DRIVER_SEARCH_RADIUS_KM, 10) || 50,
    baseRescuePrice: parseFloat(process.env.BASE_RESCUE_PRICE) || 25,
    pricePerKm: parseFloat(process.env.PRICE_PER_KM) || 2.5,
    driverPayoutPercent: parseFloat(process.env.DRIVER_PAYOUT_PERCENT) || 80,
    surgePricingEnabled: process.env.SURGE_PRICING_ENABLED === 'true',
    autoAcceptTimeoutMinutes: parseInt(process.env.AUTO_ACCEPT_TIMEOUT_MINUTES, 10) || 5,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },
  apiKey: {
    salt: process.env.API_KEY_SALT || 'your-api-key-salt',
  },
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
  },
  features: {
    utilityTasks: process.env.FEATURE_UTILITY_TASKS === 'true',
    scheduledPickups: process.env.FEATURE_SCHEDULED_PICKUPS === 'true',
    corporateAccounts: process.env.FEATURE_CORPORATE_ACCOUNTS === 'true',
  },
};

export default config;
