// const roomService = require('../services/roomService');
// const { getCurrentTime } = require('../utils/time');
const redis = require('../config/redis');

module.exports = (io) => {
  io.on('connection', async (socket) => {
    try {
      const info = await redis.info('server');
      console.log('Redis connected info:\n', info.split('\n')[0]);
    } catch (err) {
      console.error('Redis info error:', err.message);
    }
    console.log(`User Connected: ${socket.id}`);

    // Sự kiện: Tham gia phòng -> save user to redis
    // Use a Redis hash for room users so we can remove by socket id on disconnect.
    socket.on('join_room', async ({ roomId, userInfo }) => {
      console.log(
        `[REDIS VERSION] join_room event received - room: ${roomId}, user: ${userInfo?.name}`,
      );

      try {
        socket.join(roomId);

        const userData = {
          socketId: socket.id,
          userId: userInfo?.userId,
          name: userInfo?.name,
          joinedAt: Date.now(),
        };

        // Lưu user vào Redis (đúng API ioredis)
        await redis.hset(
          `room:${roomId}:users`, // key
          socket.id, // field
          JSON.stringify(userData), // value
        );

        // Lấy danh sách users
        const membersRaw = await redis.hvals(`room:${roomId}:users`);
        const members = membersRaw.map((m) => JSON.parse(m));

        console.log(
          `[REDIS VERSION] Room ${roomId} now has ${members.length} members:`,
          members,
        );

        // Emit cho mọi người trong phòng
        io.to(roomId).emit('room_users_update', members);
        socket.to(roomId).emit('user_joined', userData);

        // Ack back to the joiner so client knows join persisted in Redis
        socket.emit('joined', { roomId, members });

        // Optional: Lưu thêm thông tin phòng nếu cần
        await redis.set(`room:${roomId}:createdAt`, Date.now().toString());
      } catch (err) {
        console.error('[REDIS ERROR] in join_room:', err.message);
      }
    });

    // Sự kiện: Đồng bộ hành động (Play/Pause/Seek) -> save state to redis
    // data bao gồm: { roomId, action: 'play'|'pause'|'seek', time: number, songUrl: string }
    socket.on('sync_action', async (data) => {
      // Gửi hành động này cho tất cả mọi người trong phòng TRỪ người gửi
      const { roomId, action, time, songUrl } = data;
      try {
        // Flatten arguments: hset(key, field1, value1, field2, value2, ...)
        await redis.hset(
          `room:${roomId}:state`,
          'action',
          action,
          'time',
          time.toString(), // Redis lưu string hết
          'songUrl',
          songUrl || '',
          'updatedAt',
          Date.now().toString(),
        );

        // Broadcast cho mọi người trừ người gửi
        socket.to(roomId).emit('receive_action', data);
      } catch (err) {
        console.error('Error in sync_action Redis:', err);
      }
    });

    // Sự kiện: Gửi tin nhắn chat
    socket.on('send_message', (data) => {
      // data: { roomId, user, message, time }
      socket.to(data.roomId).emit('receive_message', data);
    });

    // Sự kiện: Đổi bài hát -> save song to redis
    socket.on('change_song', async (data) => {
      // data: { roomId, song: object }
      await redis.set(`room:${data.roomId}:song`, JSON.stringify(data.song));
      socket.to(data.roomId).emit('receive_song_change', data);
    });

    socket.on('disconnect', async () => {
      console.log('User Disconnected:', socket.id);
      const rooms = [...socket.rooms].filter((remove) => remove !== socket.id);
      for (const roomId of rooms) {
        // remove the field keyed by socket.id from the hash
        await redis.hdel(`room:${roomId}:users`, socket.id);
      }
      console.log('User Disconnected', socket.id);
    });
  });
};
