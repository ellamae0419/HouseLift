const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const { getAllUsers, getAllHouses, createUser, updateUser, deleteUser, getOwnProfile, updateOwnProfile, approveUser } = require('../controllers/usersController');

// Own-profile routes must be declared before "/:id" so "me" is never matched as an :id param.
router.get("/me", getOwnProfile);
router.put("/me", updateOwnProfile);

router.get("/houses", checkRoles("admin"), getAllHouses);
router.get("/", checkRoles("admin"), getAllUsers);
router.post("/", checkRoles("admin"), createUser);
router.put("/:id/approve", checkRoles("admin"), approveUser);
router.put("/:id", checkRoles("admin"), updateUser);
router.delete("/:id", checkRoles("admin"), deleteUser);

module.exports = router;