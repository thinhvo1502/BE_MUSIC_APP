const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    cover: { type: String },
    release_date: { type: Date },
    genre: { type: String },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Album", albumSchema);
