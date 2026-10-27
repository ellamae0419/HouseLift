const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { listTables, getTable } = require('../controllers/recordsController');

// Shows other people's details (names, mobile numbers, addresses), so it is admin-only.
router.use(checkRoles('admin'));

router.get('/', listTables);
router.get('/:table', getTable);

module.exports = router;
