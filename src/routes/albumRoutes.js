// routes/albumRoutes.js
const express = require('express');
const router = express.Router();

const {
  getAlbums,
  searchAlbums,
  getAlbumDetail,
  getAlbumsByArtist
} = require('../controllers/albumController');

router.get('/', getAlbums);
router.get('/search', searchAlbums);
router.get('/artist/:artist_id', getAlbumsByArtist);
router.get('/:id', getAlbumDetail);

module.exports = router;