const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { listOrders, getIdImage, approveOrder, rejectOrder, listFreeUnits, issueSerial } = require('../controllers/ordersController');

// Everything here handles other people's ID photos, so it is admin-only.
router.use(checkRoles('admin'));

router.get('/', listOrders);
router.get('/free-units', listFreeUnits);
router.get('/:id/id-image', getIdImage);
router.put('/:id/approve', approveOrder);
router.put('/:id/reject', rejectOrder);
router.post('/:id/serial', issueSerial);

module.exports = router;
