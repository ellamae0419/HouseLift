const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { listOrders, getIdImage, approveOrder, rejectOrder, listFreeUnits, issueSerial, registerBuyer } = require('../controllers/ordersController');

// Everything here handles other people's ID photos, so it is admin-only.
router.use(checkRoles('admin'));

router.get('/', listOrders);
router.get('/free-units', listFreeUnits);
router.get('/:id/id-image', getIdImage);
router.put('/:id/approve', approveOrder);
router.put('/:id/reject', rejectOrder);
router.post('/:id/serial', issueSerial);
// A buyer who has just paid in person: creates their account, ID record and serial code together.
router.post('/walk-in', registerBuyer);

module.exports = router;
