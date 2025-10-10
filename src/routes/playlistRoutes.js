const express = require("express");
const router = express.Router();


// const { protect } = require("../middleware/authMiddleware");

const playlistController = require("../controllers/playlistController");


// router.get("/", getPlaylists);
// router.get("/:id", getPlaylist);

// router.post("/", protect, createPlaylist);
// router.put("/:id", protect, updatePlaylist);
// router.delete("/:id", protect, deletePlaylist);


router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylist);
router.post('/', playlistController.createPlaylist);
router.put('/:id', playlistController.updatePlaylist);
router.delete('/:id', playlistController.deletePlaylist);
router.post('/:id/songs', playlistController.addSongToPlaylist);
router.delete('/:id/songs', playlistController.removeSongFromPlaylist);

module.exports = router;