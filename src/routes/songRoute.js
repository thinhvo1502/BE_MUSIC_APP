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
} = require("../controllers/songController");
const { protect } = require("../middleware/authMiddleware");
// public routes
router.get("/", getAllSongs);
router.get("/:id", getSongById);
// protected routes
router.post("/", protect, createSong);
router.put("/:id", protect, updateSong);
router.delete("/:id", protect, deleteSong);
router.get("/jamendo", importJamendoSongs);
router.get("/lyrics", getLyrics);

router.get("/top", getTopSongs);
router.get("/most-played", getMostPlayed);
router.get("/new-release", getNewRelease);
router.get("/:id/recommend", getRecommendedSongs);
module.exports = router;
