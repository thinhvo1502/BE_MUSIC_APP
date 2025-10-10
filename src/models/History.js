const mongoose = require("mongoose");

const listenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  song: { type: mongoose.Schema.Types.ObjectId, ref: "Song", required: true },
  listen_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Listen", listenSchema);
