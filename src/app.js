require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const songRoutes = require("./routes/songRoute");
const playlistRoutes = require("./routes/playlistRoutes");
const albumRoutes = require("./routes/albumRoutes");
const artistRoutes = require("./routes/artistRoutes");
const app = express();
connectDB();

app.use(express.json());
// routes
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/artists", artistRoutes);

app.get("/", (req, res) => res.send("Music App API Running"));
module.exports = app;
