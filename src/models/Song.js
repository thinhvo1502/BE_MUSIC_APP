const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    spotifyId: { type: String, sparse: true, unique: true},
    title: { type: String, required: true },
    genre: { type: String },
    cover: { type: String },
    url: { type: String, required: true },
    duration: { type: Number },
    lyric: { type: String },
    playCount: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    album: { type: mongoose.Schema.Types.ObjectId, ref: "Album" },
    // createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Song", songSchema);
