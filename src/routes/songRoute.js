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
const { getSimilarSongs } = require("../controllers/recommendationController");
const { toggleLike } = require("../controllers/likeController");
const {
  getComments,
  addComment,
  deleteComment,
} = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");
// public routes
router.get("/", getAllSongs);
router.get("/top", getTopSongs);
router.get("/most-played", getMostPlayed);
router.get("/new-release", getNewRelease);
router.get("/:id/lyrics", getLyrics);
router.get("/jamendo/import", importJamendoSongs);
router.get("/:id/recommend", getRecommendedSongs);
router.get("/:id/recommendations", getSimilarSongs);
router.post("/:id/like", protect, toggleLike);

router.get("/:id/comments", getComments);
router.post("/:id/comments", protect, addComment);
router.get("/:id", getSongById);

// protected routes
router.post("/", protect, createSong);
router.put("/:id", protect, updateSong);
router.delete("/:id", protect, deleteSong);

module.exports = router;
