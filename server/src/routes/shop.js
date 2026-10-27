const express = require('express');
const router = express.Router();
const { getProduct } = require('../controllers/shopController');
const { createInquiry } = require('../controllers/inquiriesController');
const { inquiryLimiter } = require('../middlewares/rateLimiters');

// Public on purpose: anyone may look at the product and send an inquiry. Neither creates an
// account. Accounts are made by an admin when a buyer pays in person.
router.get('/product', getProduct);
router.post('/inquiries', inquiryLimiter, createInquiry);

module.exports = router;
