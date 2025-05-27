const express = require('express');
const { progressController } = require('../controllers/progressController');

const router = express.Router();

// Progress state endpoint
router.get('/progress', progressController.getProgress);

// Completion verification endpoint
router.post('/verify-completion', progressController.verifyCompletion);

// Cleanup endpoint
router.post('/cleanup', progressController.cleanupProcessing);

module.exports = router; 