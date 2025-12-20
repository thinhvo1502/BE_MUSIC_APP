require('dotenv').config();
const passport = require('./utils/passport');
const cookieSession = require('cookie-session');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const songRoutes = require('./routes/songRoute');
const playlistRoutes = require('./routes/playlistRoutes');
const albumRoutes = require('./routes/albumRoutes');
const artistRoutes = require('./routes/artistRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const historyRoutes = require('./routes/historyRoutes');
const commentRoutes = require('./routes/commentRoutes');
const app = express();
const roomRoutes = require('./routes/roomRoutes');
connectDB();

app.use(
  cors({
    // origin: "https://orange-rock-0468a1700.3.azurestaticapps.net",
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }),
  express.json(),
);
app.use(
  cookieSession({
    name: 'session',
    keys: ['secret_key'],
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/comments', commentRoutes);
app.get('/', (req, res) => res.send('Music App API Running'));

app.use('/rooms', roomRoutes);
module.exports = app;
