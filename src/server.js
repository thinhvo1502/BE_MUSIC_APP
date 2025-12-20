const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const server = http.createServer(app);
require('./config/redis');
const io = new Server(server, {
  cors: {
    // Cho phép Frontend truy cập Socket
    origin: [
      'https://musicwebapp-eight.vercel.app',
      'http://localhost:5173',
      'https://music.bitio.io.vn',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
console.log('Loading socket handler from: ./sockets/roomSocket.js');
require('./sockets/roomSocket')(io);
const PORT = 5000;

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
