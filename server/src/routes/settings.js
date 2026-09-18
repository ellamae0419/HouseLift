const express = require('express');
const router = express.Router();
const { saveFloodThreshold } = require('../controllers/settingsController');

router.post('/flood-threshold', saveFloodThreshold);

module.exports = router;