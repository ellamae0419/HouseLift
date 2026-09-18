const express = require('express');
const router = express.Router();
const { esp32Controller, updateThreshold } = require('../controllers/esp32Controller');

router.post('/config', esp32Controller);

router.post('/threshold', updateThreshold);

module.exports = router;
