const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: "Playlist" }],
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    history: [
      {
        song: { type: mongoose.Schema.Types.ObjectId, ref: "Song" },
        listenedAt: { type: Date, default: Date.now },
      },
    ],

    refreshToken: [
      { token: String, createdAt: { type: Date, default: Date.now } },
    ],
    loginCount: { type: Number, default: 0 },
    // inside schema definition
    googleId: { type: String, index: true, sparse: true },
    refreshToken: [
      {
        token: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
// mã hoá mật khẩu trước khi lưu
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10); // salt
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// hàm so sánh mật khẩu khi đăng nhập
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
module.exports = mongoose.model("User", userSchema);
