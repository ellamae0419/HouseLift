const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { listInquiries, setInquiryStatus, deleteInquiry } = require('../controllers/inquiriesController');

// These are people's names and phone numbers, so only an admin can see them.
router.use(checkRoles('admin'));

router.get('/', listInquiries);
router.put('/:id/status', setInquiryStatus);
router.delete('/:id', deleteInquiry);

module.exports = router;
