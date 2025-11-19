import winston from 'winston';
import { env, isProduction, isDevelopment } from '@config/env';

/**
 * Custom Log Levels
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Log Colors for Console Output
 */
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

/**
 * Custom Format for Development
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  }),
);

/**
 * Custom Format for Production (JSON)
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Create Winston Logger Instance
 */
const winstonLogger = winston.createLogger({
  levels: logLevels,
  level: env.LOG_LEVEL,
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: {
    service: 'supportcarr-api',
    environment: env.NODE_ENV,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),

    // File transport for errors (production only)
    ...(isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
        ]
      : []),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

/**
 * Logger Class
 *
 * Wraps Winston logger with additional context management
 * Supports structured logging with correlation IDs
 */
export class Logger {
  private correlationId?: string;
  private context?: Record<string, unknown>;

  constructor(context?: Record<string, unknown>) {
    this.context = context;
  }

  /**
   * Set correlation ID for request tracing
   */
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Add context to all log entries
   */
  public addContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get metadata object
   */
  private getMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...this.context,
      ...meta,
      ...(this.correlationId && { correlationId: this.correlationId }),
    };
  }

  /**
   * Log error
   */
  public error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    winstonLogger.error(message, {
      ...this.getMeta(meta),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    });
  }

  /**
   * Log warning
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.warn(message, this.getMeta(meta));
  }

  /**
   * Log info
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.info(message, this.getMeta(meta));
  }

  /**
   * Log debug
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.debug(message, this.getMeta(meta));
  }

  /**
   * Create child logger with additional context
   */
  public child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger({ ...this.context, ...context });
    if (this.correlationId) {
      childLogger.setCorrelationId(this.correlationId);
    }
    return childLogger;
  }

  /**
   * Log HTTP request
   */
  public logRequest(req: {
    method: string;
    url: string;
    statusCode?: number;
    duration?: number;
    userId?: string;
  }): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: req.statusCode,
      duration: req.duration,
      userId: req.userId,
    });
  }

  /**
   * Log database query
   */
  public logQuery(query: {
    operation: string;
    collection: string;
    duration?: number;
    error?: Error;
  }): void {
    if (query.error) {
      this.error('Database Query Failed', query.error, {
        operation: query.operation,
        collection: query.collection,
        duration: query.duration,
      });
    } else {
      this.debug('Database Query', {
        operation: query.operation,
        collection: query.collection,
        duration: query.duration,
      });
    }
  }

  /**
   * Log external API call
   */
  public logExternalAPI(call: {
    service: string;
    operation: string;
    duration?: number;
    statusCode?: number;
    error?: Error;
  }): void {
    if (call.error) {
      this.error('External API Call Failed', call.error, {
        service: call.service,
        operation: call.operation,
        duration: call.duration,
        statusCode: call.statusCode,
      });
    } else {
      this.info('External API Call', {
        service: call.service,
        operation: call.operation,
        duration: call.duration,
        statusCode: call.statusCode,
      });
    }
  }

  /**
   * Log domain event
   */
  public logDomainEvent(event: {
    eventName: string;
    aggregateId: string;
    aggregateType: string;
    userId?: string;
  }): void {
    this.info('Domain Event Published', event);
  }

  /**
   * Log business metric
   */
  public logMetric(metric: {
    name: string;
    value: number;
    unit?: string;
    tags?: Record<string, string>;
  }): void {
    this.info('Business Metric', metric);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create logger with context
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return new Logger(context);
}
