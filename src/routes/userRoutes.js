const express = require("express");
const router = express.Router();
const { getLikedSongs } = require("../controllers/likeController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:id/likes", protect, getLikedSongs);

module.exports = router;
