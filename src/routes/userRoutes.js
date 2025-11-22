const express = require("express");
const router = express.Router();

const { getAllUsers, getUserById, deleteUser } = require("../controllers/userController");
const { getLikedSongs } = require("../controllers/likeController");
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getUserRecommendations,
} = require("../controllers/recommendationController");

router.get("/:id/likes", protect, getLikedSongs);
router.get("/:id/recommendations", getUserRecommendations);

// GET /api/users (Chỉ admin mới được xem)
router.get("/", protect, admin, getAllUsers);

router.get("/:id", protect, admin, getUserById);

// DELETE /api/users/:id
router.delete("/:id", protect, admin, deleteUser);

module.exports = router;
