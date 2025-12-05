const mongoose = require("mongoose");
const Artist = require("./Artist");
const Album = require("./Album");

const songSchema = new mongoose.Schema(
  {
    jamendoId: { type: String, unique: true },
    spotifyId: { type: Number, sparse: true, unique: true },
    title: { type: String, required: true },
    genre: { type: [String], default: ["Unknown"] },
    cover: { type: String },
    url: { type: String, required: true },
    duration: { type: Number },
    lyric: { type: String },
    playCount: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    album: { type: mongoose.Schema.Types.ObjectId, ref: "Album" },
    position: { type: Number },
    embeddings: { type: [Number], default: [] },
    // createdAt: { type: Date, default: Date.now },
    release_date: {
        type: Date,
        default: Date.now 
    }
  },
  { timestamps: true }
);
songSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      if (this.artist) {
        await Artist.findByIdAndUpdate(this.artist, {
          $push: { songs: this._id },
        });
      }
      if (this.album) {
        await Album.findByIdAndUpdate(this.album, {
          $push: { songs: this._id },
        });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Song", songSchema);
