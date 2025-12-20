const express = require('express');
const router = express.Router();
const roomService = require('../services/roomService');

router.post('/', (req, res) => {
  const room = roomService.createRoom(req.body);
  res.json(room);
});

module.exports = router;
