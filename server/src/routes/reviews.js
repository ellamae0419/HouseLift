const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { listReviews, setReviewStatus, deleteReview } = require('../controllers/reviewsController');

// Approving what shows on the shop is the shop owner's call, so only an admin can do it.
router.use(checkRoles('admin'));

router.get('/', listReviews);
router.put('/:id/status', setReviewStatus);
router.delete('/:id', deleteReview);

module.exports = router;
