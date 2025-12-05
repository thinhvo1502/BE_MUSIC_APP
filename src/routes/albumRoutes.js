// routes/albumRoutes.js
const express = require('express');
const router = express.Router();

const {
  searchAlbums,
  getAlbumDetail
} = require('../controllers/albumController');

router.get('/search', searchAlbums);
router.get('/:id', getAlbumDetail);


module.exports = router;