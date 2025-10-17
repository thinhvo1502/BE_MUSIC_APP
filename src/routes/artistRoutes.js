const express = require('express');
const router = express.Router();

const {
    getALlArtists,
    getArtistById,
} = require("../controllers/artistController");

// const { protect } = require("../middleware/authMiddleware");


// public routes
router.get('/', getALlArtists);
router.get('/:id', getArtistById);


// protect routes


module.exports = router;