const express = require('express');
const router = express.Router();
const { getProduct } = require('../controllers/shopController');
const { createInquiry } = require('../controllers/inquiriesController');
const { createReview, listPublicReviews } = require('../controllers/reviewsController');
const { inquiryLimiter, reviewLimiter } = require('../middlewares/rateLimiters');

// Public on purpose: anyone may look at the product and send an inquiry. Neither creates an
// account. Accounts are made by an admin when a buyer pays in person.
router.get('/product', getProduct);
router.post('/inquiries', inquiryLimiter, createInquiry);

// Reviews are public to read (approved ones only). Writing one needs the serial code a buyer was given.
router.get('/reviews', listPublicReviews);
router.post('/reviews', reviewLimiter, createReview);

module.exports = router;
