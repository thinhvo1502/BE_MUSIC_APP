const express = require("express");
const router = express.Router();
const {
  createSong,
  getAllSongs,
  getSongById,
  updateSong,
  deleteSong,
} = require("../controllers/songController");
const { protect } = require("../middleware/authMiddleware");
// public routes
router.get("/", getAllSongs);
router.get("/:id", getSongById);
// protected routes
router.post("/", protect, createSong);
router.put("/:id", protect, updateSong);
router.delete("/:id", protect, deleteSong);
module.exports = router;
