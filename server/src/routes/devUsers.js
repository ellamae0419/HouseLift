const express = require('express');
const router = express.Router();
const { createUser } = require('../controllers/usersController');

// Dev-only route to create users without auth checks. Only enabled when NODE_ENV !== 'production'.
router.post('/', createUser);

module.exports = router;
