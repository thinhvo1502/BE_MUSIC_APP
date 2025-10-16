const express = require("express");
const router = express.Router();

const {
    getAlbums,
    getAlbumById,
    getAlbumsByArtist,
} = require("../controllers/albumController");

// const { protect } = require("../middleware/authMiddleware");


// public routes
router.get('/', getAlbums);
router.get('/artist', getAlbumsByArtist);
router.get('/:id', getAlbumById);


// protect routes


module.exports = router;