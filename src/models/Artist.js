const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema(
  {
    artist_id: { type: String, required: true },
    name: { type: String, required: true },
    bio: { type: String },
    avatar: { type: String },
    website: { type: String },
    joindate: { type: Date },
    albums: [{ type: mongoose.Schema.Types.ObjectId, ref: "Album" }],
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    isDeleted: { type: Boolean, default: false},  // nếu delete thì ẩn 1 field của artist
  },
  { timestamps: true }
);

module.exports = mongoose.model("Artist", artistSchema);
