const express = require("express");
const router = express.Router();


const { protect } = require("../middleware/authMiddleware");

const playlistController = require("../controllers/playlistController");

// public routes
router.get('/', playlistController.getPlaylists);
router.get('/me', protect, playlistController.getMyPlaylists);
router.get('/:id', playlistController.getPlaylist);

// protect routes
router.post('/', protect , playlistController.createPlaylist);
router.put('/:id', protect, playlistController.updatePlaylist);
router.delete('/:id', protect, playlistController.deletePlaylist);
router.post('/:id/songs', protect, playlistController.addSongToPlaylist);
router.delete('/:id/songs', protect, playlistController.removeSongFromPlaylist);

module.exports = router;