const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    isPublic: { type: Boolean, default: true },
    imageUrl: { type: String },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Playlist", playlistSchema);
