const express = require("express");
const router = express.Router();
const {
  createSong,
  getAllSongs,
  getSongById,
  updateSong,
  deleteSong,
  importJamendoSongs,
  getLyrics,
  getTopSongs,
  getMostPlayed,
  getNewRelease,
  getRecommendedSongs,
  getJamendoSongs,
} = require("../controllers/songController");
const { toggleLike } = require("../controllers/likeController");
const { protect } = require("../middleware/authMiddleware");
// public routes
router.get("/", getAllSongs);
router.get("/top", getTopSongs);
router.get("/most-played", getMostPlayed);
router.get("/new-release", getNewRelease);
router.get("/lyrics", getLyrics);
router.get("/jamendo/import", importJamendoSongs);
router.get("/:id/recommend", getRecommendedSongs);
router.post("/:id/like", protect, toggleLike);
router.get("/:id", getSongById);

// protected routes
router.post("/", protect, createSong);
router.put("/:id", protect, updateSong);
router.delete("/:id", protect, deleteSong);

module.exports = router;
