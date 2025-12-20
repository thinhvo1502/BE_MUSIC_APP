const { rooms } = require('../data/roomStore');
const crypto = require('crypto');

function createRoom({ userId, songUrl }) {
  const roomId = crypto.randomUUID();

  rooms[roomId] = {
    id: roomId,
    hostId: userId,
    songUrl,
    isPlaying: false,
    currentTime: 0,
    lastUpdate: Date.now(),
    users: [],
  };

  return rooms[roomId];
}

function getRoom(roomId) {
  return rooms[roomId];
}

function cleanup() {
  Object.keys(rooms).forEach((key) => delete rooms[key]);
}

module.exports = { createRoom, getRoom, cleanup };
