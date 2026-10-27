const express = require('express');
const router = express.Router();
const { getProduct, placeOrder } = require('../controllers/shopController');
const { orderLimiter } = require('../middlewares/rateLimiters');

// Public on purpose: this is how a stranger becomes a customer.
router.get('/product', getProduct);
router.post('/orders', orderLimiter, placeOrder);

module.exports = router;
