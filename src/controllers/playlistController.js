const mongoose = require("mongoose"); // <--- THÊM DÒNG NÀY
const axios = require("axios");
const Playlist = require("../models/Playlist");
const Song = require("../models/Song");
const Artist = require("../models/Artist");
const User = require("../models/User");

require("dotenv").config();

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// get Spotify access token
// async function getSpotifyAccessToken() {
//   const clientId = process.env.SPOTIFY_CLIENT_ID;
//   const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

//   const response = await axios.post('https://accounts.spotify.com/api/token',
//     'grant_type=client_credentials',
//     {
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//         'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
//       },
//     }
//     );
//   return response.data.access_token;
// }

// get '/' all playlists
exports.getPlaylists = async (req, res) => {
  try {
    // const playlistId = req.params.id;
    const response = await axios.get(
      `https://api.jamendo.com/v3.0/playlists/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=10&name=`
    );

    const playlists = response.data.results;

    const resultWithTrackCount = playlists.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      track_count: p.track_count || (p.tracks ? p.tracks.length : 0),
      tracks: p.tracks || [],
    }));

    res.json({
      total_playlists:
        response.data.headers?.results_fullcount || playlists.length,
      playlists: resultWithTrackCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Lay Playlists tu Jamendo API that bai",
    });
  }
};

//lấy playlist của user
exports.getMyPlaylists = async (req, res) => {
  try {
    // 1. Lấy ID người dùng từ token (đã qua middleware auth)
    // req.user được gán từ middleware verifyToken
    const userId = req.user._id || req.user.id;

    // 2. Tìm trong Database MongoDB các playlist có user trùng với userId
    const playlists = await Playlist.find({ user: userId })
      .populate("songs") // Lấy luôn chi tiết bài hát nếu cần
      .sort({ createdAt: -1 }); // Sắp xếp mới nhất lên đầu

    // 3. Trả về kết quả
    // Lúc này dữ liệu sẽ là chuẩn MongoDB (_id, name, songs, ...)
    res.json({
      success: true,
      count: playlists.length,
      playlists: playlists,
    });
  } catch (error) {
    console.error("Lỗi lấy playlist user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách playlist",
    });
  }
};

// Get :id khi click vo playlist
// exports.getPlaylist = async (req, res) => {
//   try {
//     const playlistId = req.params.id;
//     if (!playlistId) {
//       return res.status(400).json({ message: "Thiếu playlist ID" });
//     }

//     const response = await axios.get(
//       https://api.jamendo.com/v3.0/playlists/tracks/?client_id=${JAMENDO_CLIENT_ID}&id=${playlistId}&format=json
//     );

//     const playlist = response.data.results?.[0];
//     if ( !playlist ) {
//       return res.status(404).json({ message: "Playlist khong ton tai" });
//     }

//     const totalTracks = playlist.tracks?.length || 0;

//     res.json({
//       id: playlist.id,
//       name: playlist.name,
//       image: playlist.image,
//       track_count: totalTracks,
//       tracks: playlist.tracks
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Lay playlist chi tiet khong thanh cong',
//     })
//   }
// };

exports.getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate({
        path: "songs",
        populate: [
          {
            path: "album",
            select: "title cover", // <--- SỬA THÀNH 'title' (trước là 'name')
          },
          {
            path: "artist",
            select: "name username",
          },
        ],
      })
      .populate("user", "username");

    if (!playlist) return res.status(404).json({ message: "Not found" });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPlaylist = async (req, res) => {
  try {
    const { name, descripsion, songs } = req.body;

    const newPlaylist = new Playlist({
      name,
      descripsion,
      user: req.user._id,
      songs: songs || [],
    });
    await newPlaylist.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { playlists: newPlaylist._id },
    });

    await newPlaylist.populate("songs");

    res.status(201).json({
      success: true,
      data: newPlaylist,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Create Playlist that bai" });
  }
};

exports.updatePlaylist = async (req, res) => {
  try {
    // 1. Lấy dữ liệu từ Frontend gửi lên
    // Frontend gửi: { name, description, cover }
    const { name, description, cover } = req.body;
    const playlistId = req.params.id;

    // 2. Chuẩn bị dữ liệu để lưu vào Database
    const updateData = {
      name: name,
      description: description,
      // QUAN TRỌNG: Map từ 'cover' (frontend) sang 'imageUrl' (model của bạn)
      imageUrl: cover,
    };

    // 3. Tìm và Update
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      updateData,
      { new: true } // Trả về data mới sau khi sửa
    )
      .populate("user", "username") // Lấy thông tin user để hiển thị lại header
      .populate("songs"); // (Tùy chọn) Populate songs để tránh lỗi nếu frontend cần

    if (!updatedPlaylist) {
      return res.status(404).json({ message: "Playlist không tồn tại" });
    }

    res.json({
      message: "Cập nhật thành công",
      data: updatedPlaylist,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.deletePlaylist = async (req, res) => {
  const deleted = await Playlist.findByIdAndDelete(req.params.id);
  if (!deleted)
    return res.status(404).json({ message: "Playlist không tồn tại" });
  res.json({ message: "Playlist đã được xóa" });
};

// Add/Remove songs from playlist
// POST /api/playlists/:id(playlistId)/songs
// exports.addSongToPlaylist = async (req, res) => {
//   try {
//     const { jamendoId } = req.body;
//     const playlist = await Playlist.findById(req.params.id);

//     if (!playlist) {
//       return res.status(404).json({ message: "Playlist không tồn tại" });
//     }

//     // Gọi Jamendo API để lấy thông tin bài hát
//     const { data } = await axios.get(
//       https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&id=${jamendoId}&format=json
//     );

//     const track = data.results[0];
//     if (!track) {
//       return res
//         .status(404)
//         .json({ message: "Không tìm thấy bài hát trên Jamendo" });
//     }

//     const artistName = track.artist_name;
//     let artist = await Artist.findOne({ name: artistName });
//     if (!artist) {
//       artist = await Artist.create({ name: artistName });
//     }

//     // Kiểm tra xem bài hát đã tồn tại trong DB chưa
//     let song = await Song.findOne({ jamendoId: track.id });
//     if (!song) {
//       song = await Song.create({
//         title: track.name,
//         jamendoId: track.id,
//         cover: track.image || track.album_image || "",
//         url: track.audio || track.audio_download || track.shareurl,
//         artist: artist._id,
//         duration: track.duration * 1000, // giây → đổi sang ms
//       });
//     }

//     if (!playlist.songs.includes(song._id)) {
//       playlist.songs.push(song._id);
//       await playlist.save();
//     }

//     await playlist.populate("songs");
//     res.json(playlist);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Lỗi khi thêm bài hát vào playlist" });
//   }
// };

// add song to playlist mới
exports.addSongToPlaylist = async (req, res) => {
  try {
    // Frontend gửi lên có thể là MongoID (nếu bài hát đã có trong DB)
    // hoặc JamendoID (nếu tìm kiếm từ API ngoài)
    const { jamendoId } = req.body;
    const playlistId = req.params.id;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist không tồn tại" });
    }

    let song = null;

    // --- BƯỚC 1: KIỂM TRA TRONG DATABASE CỦA MÌNH TRƯỚC ---

    // Kiểm tra xem ID gửi lên có phải là định dạng ObjectId của MongoDB không?
    if (mongoose.Types.ObjectId.isValid(jamendoId)) {
      // Nếu đúng format Mongo, tìm thử trong DB xem có bài hát này không
      song = await Song.findById(jamendoId);
    }

    // Nếu không tìm thấy bằng ID trực tiếp, tìm thử bằng trường jamendoId trong DB
    if (!song) {
      song = await Song.findOne({ jamendoId: jamendoId });
    }

    // --- BƯỚC 2: NẾU VẪN CHƯA CÓ, MỚI GỌI RA JAMENDO ---
    if (!song) {
      // Gọi Jamendo API để lấy thông tin bài hát
      const { data } = await axios.get(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${process.env.JAMENDO_CLIENT_ID}&id=${jamendoId}&format=json`
      );

      const track = data.results[0];
      if (!track) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy bài hát trên Jamendo" });
      }

      // Tạo Artist nếu chưa có
      const artistName = track.artist_name;
      let artist = await Artist.findOne({ name: artistName });
      if (!artist) {
        artist = await Artist.create({ name: artistName });
      }

      // Tạo bài hát mới
      song = await Song.create({
        title: track.name,
        jamendoId: track.id,
        cover: track.image || track.album_image || "",
        url: track.audio || track.audio_download || track.shareurl,
        artist: artist._id,
        duration: track.duration * 1000,
      });
    }

    // --- BƯỚC 3: THÊM VÀO PLAYLIST (Logic giữ nguyên) ---
    // Kiểm tra trùng lặp
    // Lưu ý: song._id lúc này chắc chắn là ObjectId
    if (playlist.songs.includes(song._id)) {
      return res
        .status(400)
        .json({ message: "Bài hát này đã có trong playlist" });
    }

    playlist.songs.push(song._id);
    await playlist.save();

    // Populate để trả về dữ liệu đẹp
    await playlist.populate("songs");

    res.json(playlist);
  } catch (err) {
    console.error("Add Song Error:", err);
    res.status(500).json({ message: "Lỗi khi thêm bài hát vào playlist" });
  }
};

exports.removeSongFromPlaylist = async (req, res) => {
  try {
    const { id, songId } = req.params;

    // 1. Kiểm tra Playlist có tồn tại không
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist không tồn tại" });
    }

    // 2. Ép kiểu songId sang ObjectId của MongoDB để so sánh chính xác
    const songObjectId = new mongoose.Types.ObjectId(songId);

    // 3. Thực hiện xóa (Dùng $pull)
    // Code này sẽ cố gắng xóa bài hát dù nó đang lưu ở dạng cũ (ID) hay dạng mới (Object)
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      {
        $pull: {
          songs: {
            // Cách 1: Nếu songs là mảng Object [{ song: ObjectId, addedAt: ... }]
            // Chúng ta tìm item nào có field 'song' trùng với ID
            song: songObjectId,
          },
        },
      },
      { new: true }
    ).populate("songs.song");

    // --- PHÒNG TRƯỜNG HỢP DỮ LIỆU CŨ (Mảng ID thuần) ---
    // Nếu cách trên không xóa được gì (độ dài mảng vẫn y nguyên), thử xóa theo kiểu ID thuần
    if (updatedPlaylist.songs.length === playlist.songs.length) {
      await Playlist.findByIdAndUpdate(id, {
        $pull: { songs: songObjectId }, // Xóa trực tiếp ID khỏi mảng
      });
      // Fetch lại lần nữa để trả về kết quả đúng
      const finalPlaylist = await Playlist.findById(id).populate("songs.song");
      return res.json({
        message: "Đã xóa (dữ liệu cũ)",
        playlist: finalPlaylist,
      });
    }

    res.json({
      message: "Đã xóa bài hát khỏi playlist",
      playlist: updatedPlaylist,
    });
  } catch (err) {
    console.error("Lỗi xóa bài hát:", err);
    res.status(500).json({ message: "Lỗi Server khi xóa bài hát" });
  }
};
