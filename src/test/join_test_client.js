const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

(async () => {
  const socket = io(SOCKET_URL, { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('Connected as test client:', socket.id);
    socket.emit('join_room', {
      roomId: 'test-room-1',
      userInfo: { userId: 'u1', name: 'Tester' },
    });
  });

  socket.on('joined', (data) => {
    console.log('Join ack received:', data);
  });

  socket.on('room_users_update', (members) => {
    console.log('room_users_update', members);
  });

  socket.on('disconnect', () => {
    console.log('Test client disconnected');
  });

  // keep process alive
  setTimeout(() => {
    console.log('Ending test client after 20s');
    socket.disconnect();
    process.exit(0);
  }, 20000);
})();
