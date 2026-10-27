const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { getAllUsers, getAllHouses, createUser, updateUser, deleteUser, getOwnProfile, updateOwnProfile, approveUser, activateDevice, getSmsStatus, sendTestText } = require('../controllers/usersController');
const { activateLimiter, testSmsLimiter } = require('../middlewares/rateLimiters');
const { getThreshold, putThreshold, postLift, getStatus } = require('../controllers/deviceController');

// Own-profile and device routes must be declared before "/:id" so their
// fixed paths are never matched as an :id param.
router.get("/me", getOwnProfile);
router.put("/me", updateOwnProfile);
router.post("/activate", activateLimiter, activateDevice);

// Browser-facing device routes. Regular users always act on their own
// device; admins may pass ?esp32_id= to target any house.
router.get("/esp32-threshold", getThreshold);
router.put("/esp32-threshold", putThreshold);
router.post("/esp32-lift", postLift);
router.get("/esp32-status", getStatus);

router.get("/houses", checkRoles("admin"), getAllHouses);
router.get("/sms-status", checkRoles("admin"), getSmsStatus);
router.post("/test-sms", checkRoles("admin"), testSmsLimiter, sendTestText);
router.get("/", checkRoles("admin"), getAllUsers);
router.post("/", checkRoles("admin"), createUser);
router.put("/:id/approve", checkRoles("admin"), approveUser);
router.put("/:id", checkRoles("admin"), updateUser);
router.delete("/:id", checkRoles("admin"), deleteUser);

module.exports = router;