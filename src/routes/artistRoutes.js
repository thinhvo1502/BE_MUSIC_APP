const express = require('express');
const router = express.Router();

const {
    getALlArtists,
    getArtistById,
    createArtist,
    updatedArtist,
    deleteArtist,
} = require("../controllers/artistController");

// const { protect } = require("../middleware/authMiddleware");


// public routes
router.get('/', getALlArtists);
router.get('/:id', getArtistById);
router.post('/', createArtist);
router.put('/:id', updatedArtist);
router.delete('/:id', deleteArtist);
// protect routes


module.exports = router;