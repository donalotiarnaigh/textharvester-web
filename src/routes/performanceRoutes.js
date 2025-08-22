/**
 * Performance monitoring API routes
 */

const express = require('express');
const router = express.Router();
const PerformanceTracker = require('../utils/performanceTracker');
const logger = require('../utils/logger');

/**
 * Get current performance statistics
 * GET /api/performance/stats
 */
router.get('/stats', (req, res) => {
  try {
    const { provider, model } = req.query;
    const tracker = PerformanceTracker.getInstance();
    const stats = tracker.getStats(provider, model);
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance statistics',
      message: error.message
    });
  }
});

/**
 * Get recent performance metrics
 * GET /api/performance/recent
 */
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tracker = PerformanceTracker.getInstance();
    const recentMetrics = tracker.getRecentMetrics(limit);
    
    res.json({
      success: true,
      metrics: recentMetrics,
      count: recentMetrics.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting recent metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent metrics',
      message: error.message
    });
  }
});

/**
 * Get performance summary report
 * GET /api/performance/summary
 */
router.get('/summary', (req, res) => {
  try {
    const tracker = PerformanceTracker.getInstance();
    const summary = tracker.generateSummary();
    
    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating performance summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance summary',
      message: error.message
    });
  }
});

/**
 * Get current system performance
 * GET /api/performance/system
 */
router.get('/system', (req, res) => {
  try {
    const systemMetrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      system: systemMetrics
    });
  } catch (error) {
    logger.error('Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system metrics',
      message: error.message
    });
  }
});

/**
 * Get combined performance dashboard data
 * GET /api/performance/dashboard
 */
router.get('/dashboard', (req, res) => {
  try {
    const tracker = PerformanceTracker.getInstance();
    
    const dashboardData = {
      summary: tracker.generateSummary(),
      recentMetrics: tracker.getRecentMetrics(10),
      systemMetrics: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      stats: tracker.getStats()
    };
    
    res.json({
      success: true,
      dashboard: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

/**
 * Clear performance metrics (for testing/debugging)
 * POST /api/performance/clear
 */
router.post('/clear', (req, res) => {
  try {
    const tracker = PerformanceTracker.getInstance();
    tracker.clearMetrics();
    
    logger.info('Performance metrics cleared');
    
    res.json({
      success: true,
      message: 'Performance metrics cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear performance metrics',
      message: error.message
    });
  }
});

module.exports = router;
