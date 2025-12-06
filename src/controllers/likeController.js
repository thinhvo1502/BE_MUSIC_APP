const mongoose = require("mongoose");
const User = require("../models/User");
const Song = require("../models/Song");
const Artist = require("../models/Artist");
const Album = require("../models/Album");
// Import hàm lấy nhạc từ file config hoặc service của bạn
const { getJamendoTracks, getJamendoArtists } = require("../config/jamendo"); 

exports.toggleLike = async (req, res) => {
  const userId = req.user.id;
  const songId = req.params.id; // Có thể là ID Jamendo (123456)
  
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const user = await User.findById(userId).session(session);
    
    // --- 1. TÌM BÀI HÁT ---
    let song = null;
    if (mongoose.Types.ObjectId.isValid(songId)) {
        song = await Song.findById(songId).session(session);
    } else {
        song = await Song.findOne({ spotifyId: songId }).session(session);
    }

    // --- 2. NẾU CHƯA CÓ -> TỰ ĐỘNG IMPORT TỪ JAMENDO (LAZY IMPORT) ---
    if (!song) {
        // Gọi API Jamendo lấy info bài hát
        const tracks = await getJamendoTracks({}, songId);
        
        // Nếu API Jamendo cũng không tìm ra -> Lỗi thật sự
        if (!tracks || tracks.length === 0) {
             await session.abortTransaction(); session.endSession();
             return res.status(404).json({ message: "Song not found anywhere" });
        }

        const t = tracks[0]; // Bài hát từ Jamendo

        // Tìm hoặc tạo Artist (Giống logic import cũ của bạn)
        let artistDoc = await Artist.findOne({ name: t.artist_name }).session(session);
        if (!artistDoc) {
             artistDoc = await Artist.create([{
                 name: t.artist_name,
                 artist_id: t.artist_id,
                 avatar: t.artist_image,
                 joindate: t.artist_joindate
             }], { session });
             artistDoc = artistDoc[0];
        }

        // Tìm hoặc tạo Album
        let albumDoc = await Album.findOne({ title: t.album_name, artist: artistDoc._id }).session(session);
        if (!albumDoc) {
             albumDoc = await Album.create([{
                 title: t.album_name,
                 artist: artistDoc._id,
                 cover: t.album_image,
                 release_date: t.releasedate
             }], { session });
             albumDoc = albumDoc[0];
        }

        // Tạo bài hát mới
        song = await Song.create([{
            spotifyId: t.id,
            title: t.name,
            genre: t.musicinfo?.tags?.genres || ["Unknown"],
            cover: t.image,
            url: t.audio,
            duration: t.duration,
            artist: artistDoc._id,
            album: albumDoc._id,
            release_date: t.releasedate || new Date()
        }], { session });
        song = song[0];
    }
    // ----------------------------------------------------------------

    // --- 3. LOGIC LIKE/UNLIKE (GIỮ NGUYÊN) ---
    const hasLiked = user.likedSongs.some((s) => s.equals(song._id));
    let action;

    if (!hasLiked) {
      user.likedSongs.push(song._id);
      song.likes = (song.likes || 0) + 1;
      action = "liked";
    } else {
      user.likedSongs = user.likedSongs.filter((s) => !s.equals(song._id));
      song.likes = Math.max(0, (song.likes || 0) - 1);
      action = "unliked";
    }

    await user.save({ session });
    await song.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    const updatedUser = await User.findById(userId).populate("likedSongs");

    return res.json({
      message: `Song ${action} successfully`,
      likedSongs: updatedUser.likedSongs,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Toggle Like Error:", err);
    return res.status(500).json({ message: "Toggle like failed", error: err.message });
  }
};
// [GET] /api/users/:id/likes
exports.getLikedSongs = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate({
        path: "likedSongs",
        populate: [
            { path: "artist", select: "name artist_id avatar" }, 
            { path: "album", select: "title cover" }  
        ]
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      user: user.username,
      total: user.likedSongs.length,
      likeSongs: user.likedSongs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get liked songs failed" });
  }
};
