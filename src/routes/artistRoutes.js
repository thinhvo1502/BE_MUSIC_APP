const express = require('express');
const router = express.Router();

const {
    getALlArtists,
    getArtistById,
    createArtist,
    updatedArtist,
    deleteArtist,
    getArtistTopTracks
} = require("../controllers/artistController");
const { getAlbumsByArtist } = require("../controllers/albumController");
// const { protect } = require("../middleware/authMiddleware");



// public routes
router.get('/', getALlArtists);
router.get('/:id', getArtistById);
router.post('/', createArtist);
router.get('/:artist_id/albums', getAlbumsByArtist);
router.put('/:id', updatedArtist);
router.delete('/:id', deleteArtist);
router.get('/:id/top-tracks', getArtistTopTracks);
// protect routes


module.exports = router;