const { io } = require('socket.io-client');

async function connectClient(name) {
  const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    reconnectionAttempts: 3,
  });

  socket.on('connect', () => {
    console.log(`${name} connected:`, socket.id);
    socket.emit('join_room', {
      roomId: '2718',
      userInfo: { userId: name, name },
    });
  });

  socket.on('connect_error', (err) => {
    console.error('connect_error', err.message);
  });

  return socket;
}

(async () => {
  const a = await connectClient('userA');
  const b = await connectClient('userB');

  // keep alive for a bit to allow Redis writes
  setTimeout(() => {
    a.disconnect();
    b.disconnect();
    console.log('done');
  }, 3000);
})();
