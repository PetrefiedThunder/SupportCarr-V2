import express from 'express';
import metricsService from '../services/metricsService.js';

const router = express.Router();

/**
 * @route   GET /metrics
 * @desc    Prometheus metrics endpoint
 * @access  Public (but should be protected by firewall in production)
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain');
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

/**
 * @route   GET /metrics/json
 * @desc    Get metrics as JSON (for debugging)
 * @access  Public
 */
router.get('/json', async (req, res) => {
  try {
    const metrics = await metricsService.getMetricsJSON();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
