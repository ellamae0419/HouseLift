const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/usersController');

router.get("/", checkRoles("admin"), getAllUsers);
router.post("/", checkRoles("admin"), createUser);
router.put("/:id", checkRoles("admin"), updateUser);
router.delete("/:id", checkRoles("admin"), deleteUser);

module.exports = router;