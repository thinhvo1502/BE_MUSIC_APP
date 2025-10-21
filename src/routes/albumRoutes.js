const express = require("express");
const router = express.Router();

const {
    getAlbums,
    getAlbumById,
    getAlbumsByArtistById,
} = require("../controllers/albumController");

// const { protect } = require("../middleware/authMiddleware");


// public routes
router.get('/', getAlbums);
router.get('/artist', getAlbumsByArtistById);
router.get('/:id', getAlbumById);


// protect routes


module.exports = router;