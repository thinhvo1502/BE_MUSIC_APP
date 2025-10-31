const express = require("express");
const router = express.Router();
const { getLikedSongs } = require("../controllers/likeController");
const { protect } = require("../middleware/authMiddleware");
const {
  getUserRecommendations,
} = require("../controllers/recommendationController");

router.get("/:id/likes", protect, getLikedSongs);
router.get("/:id/recommendations", getUserRecommendations);
module.exports = router;
