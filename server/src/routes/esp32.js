const express = require('express');
const router = express.Router();
const { esp32Controller } = require('../controllers/esp32Controller');
const verifyDeviceKey = require('../middlewares/verifyDeviceKey');

// Device-only route — the browser now uses /users/esp32-threshold instead.
router.post('/config', verifyDeviceKey, esp32Controller);

module.exports = router;
