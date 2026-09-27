const express = require('express');
const router = express.Router();
const { waterLevel, liftEvents, summary } = require('../controllers/reportsController');

// Mounted behind the global verifyJWT. Scoping (own device vs. any house for
// admins) is handled per-request inside the controller.
router.get('/water-level', waterLevel);
router.get('/lift-events', liftEvents);
router.get('/summary', summary);

module.exports = router;
