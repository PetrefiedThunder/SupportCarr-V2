import promClient from 'prom-client';
import logger from '../utils/logger.js';

/**
 * Prometheus Metrics Service
 * Collects and exposes application metrics for monitoring
 */
class MetricsService {
  constructor() {
    // Create a Registry to register the metrics
    this.register = new promClient.Registry();

    // Add default metrics
    promClient.collectDefaultMetrics({ register: this.register });

    // Custom metrics
    this.initializeMetrics();
  }

  initializeMetrics() {
    // HTTP Request Duration
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    // HTTP Request Total
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Active Rescues
    this.activeRescuesGauge = new promClient.Gauge({
      name: 'supportcarr_active_rescues',
      help: 'Number of currently active rescues',
    });

    // Total Rescues Created
    this.totalRescuesCounter = new promClient.Counter({
      name: 'supportcarr_total_rescues_created',
      help: 'Total number of rescues created',
    });

    // Rescues by Status
    this.rescuesByStatusGauge = new promClient.Gauge({
      name: 'supportcarr_rescues_by_status',
      help: 'Number of rescues by status',
      labelNames: ['status'],
    });

    // Online Drivers
    this.onlineDriversGauge = new promClient.Gauge({
      name: 'supportcarr_online_drivers',
      help: 'Number of online drivers',
    });

    // Payment Success Rate
    this.paymentSuccessRate = new promClient.Gauge({
      name: 'supportcarr_payment_success_rate',
      help: 'Payment success rate (percentage)',
    });

    // Revenue Total
    this.revenueCounter = new promClient.Counter({
      name: 'supportcarr_revenue_total_cents',
      help: 'Total revenue in cents',
    });

    // Database Query Duration
    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    // Redis Operation Duration
    this.redisOperationDuration = new promClient.Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    // WebSocket Connections
    this.websocketConnectionsGauge = new promClient.Gauge({
      name: 'websocket_connections_total',
      help: 'Number of active WebSocket connections',
    });

    // Job Queue Size
    this.jobQueueSize = new promClient.Gauge({
      name: 'job_queue_size',
      help: 'Number of jobs in queue',
      labelNames: ['queue'],
    });

    // Job Processing Duration
    this.jobProcessingDuration = new promClient.Histogram({
      name: 'job_processing_duration_seconds',
      help: 'Duration of job processing in seconds',
      labelNames: ['queue', 'job_name'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    });

    // Job Success/Failure
    this.jobProcessingTotal = new promClient.Counter({
      name: 'job_processing_total',
      help: 'Total number of processed jobs',
      labelNames: ['queue', 'job_name', 'status'],
    });

    // API Rate Limit Hits
    this.rateLimitHits = new promClient.Counter({
      name: 'rate_limit_hits_total',
      help: 'Number of rate limit hits',
      labelNames: ['route'],
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.activeRescuesGauge);
    this.register.registerMetric(this.totalRescuesCounter);
    this.register.registerMetric(this.rescuesByStatusGauge);
    this.register.registerMetric(this.onlineDriversGauge);
    this.register.registerMetric(this.paymentSuccessRate);
    this.register.registerMetric(this.revenueCounter);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.redisOperationDuration);
    this.register.registerMetric(this.websocketConnectionsGauge);
    this.register.registerMetric(this.jobQueueSize);
    this.register.registerMetric(this.jobProcessingDuration);
    this.register.registerMetric(this.jobProcessingTotal);
    this.register.registerMetric(this.rateLimitHits);

    logger.info('Prometheus metrics initialized');
  }

  /**
   * Middleware to track HTTP requests
   */
  trackHttpRequest() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;

        this.httpRequestDuration.observe(
          { method: req.method, route, status_code: res.statusCode },
          duration
        );

        this.httpRequestTotal.inc({
          method: req.method,
          route,
          status_code: res.statusCode,
        });
      });

      next();
    };
  }

  /**
   * Track rescue creation
   */
  trackRescueCreated() {
    this.totalRescuesCounter.inc();
  }

  /**
   * Update active rescues count
   */
  updateActiveRescues(count) {
    this.activeRescuesGauge.set(count);
  }

  /**
   * Update rescues by status
   */
  updateRescuesByStatus(status, count) {
    this.rescuesByStatusGauge.set({ status }, count);
  }

  /**
   * Update online drivers count
   */
  updateOnlineDrivers(count) {
    this.onlineDriversGauge.set(count);
  }

  /**
   * Track revenue
   */
  trackRevenue(amountInCents) {
    this.revenueCounter.inc(amountInCents);
  }

  /**
   * Update payment success rate
   */
  updatePaymentSuccessRate(rate) {
    this.paymentSuccessRate.set(rate);
  }

  /**
   * Track database query
   */
  trackDbQuery(operation, collection, duration) {
    this.dbQueryDuration.observe({ operation, collection }, duration);
  }

  /**
   * Track Redis operation
   */
  trackRedisOperation(operation, duration) {
    this.redisOperationDuration.observe({ operation }, duration);
  }

  /**
   * Update WebSocket connections
   */
  updateWebSocketConnections(count) {
    this.websocketConnectionsGauge.set(count);
  }

  /**
   * Update job queue size
   */
  updateJobQueueSize(queue, size) {
    this.jobQueueSize.set({ queue }, size);
  }

  /**
   * Track job processing
   */
  trackJobProcessing(queue, jobName, duration, status) {
    this.jobProcessingDuration.observe({ queue, job_name: jobName }, duration);
    this.jobProcessingTotal.inc({ queue, job_name: jobName, status });
  }

  /**
   * Track rate limit hit
   */
  trackRateLimitHit(route) {
    this.rateLimitHits.inc({ route });
  }

  /**
   * Get metrics for Prometheus scraping
   */
  async getMetrics() {
    return this.register.metrics();
  }

  /**
   * Get metrics as JSON (for debugging)
   */
  async getMetricsJSON() {
    return this.register.getMetricsAsJSON();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics() {
    this.register.resetMetrics();
  }
}

export default new MetricsService();
