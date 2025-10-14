const axios = require("axios");
const Playlist = require("../models/Playlist");
const Song = require("../models/Song");
const Artist = require("../models/Artist");
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

exports.getPlaylists = async (req, res) => {
  const playlists = await Playlist.find();
  res.json(playlists);
};

exports.getPlaylist = async (req, res) => {
  const playlist = await Playlist.findById(req.params.id).populate("songs");
  if (!playlist) return res.status(404).json({ message: "Playlist không tồn tại" });
  res.json(playlist);
};

exports.createPlaylist = async (req, res) => {
  const { name, description } = req.body;
  const newPlaylist = new Playlist({ name, description });
  await newPlaylist.save();
  res.status(201).json(newPlaylist);
};

exports.updatePlaylist = async (req, res) => {
  const updated = await Playlist.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  ).populate("songs");
  if (!updated) return res.status(404).json({ message: "Playlist không tồn tại" });
  res.json(updated);
};

exports.deletePlaylist = async (req, res) => {
  const deleted = await Playlist.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Playlist không tồn tại" });
  res.json({ message: "Playlist đã được xóa" });
};


// Add/Remove songs from playlist
// POST /api/playlists/:id(playlistId)/songs
exports.addSongToPlaylist = async (req, res) => {
  try {
    const { jamendoId } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist không tồn tại" });
    }

    // Gọi Jamendo API để lấy thông tin bài hát
    const { data } = await axios.get(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&id=${jamendoId}&format=json`
    );

    const track = data.results[0];
    if (!track) {
      return res.status(404).json({ message: "Không tìm thấy bài hát trên Jamendo" });
    }

    const artistName = track.artist_name;
    let artist = await Artist.findOne({ name: artistName });
    if (!artist) {
      artist = await Artist.create({ name: artistName });
    }

    // Kiểm tra xem bài hát đã tồn tại trong DB chưa
    let song = await Song.findOne({ jamendoId: track.id });
    if (!song) {
      song = await Song.create({
        title: track.name,
        jamendoId: track.id,
        cover: track.image || track.album_image || "",
        url: track.audio || track.audio_download || track.shareurl,
        artist: artist._id,
        duration: track.duration * 1000, // giây → đổi sang ms
      });
    }

    if (!playlist.songs.includes(song._id)) {
      playlist.songs.push(song._id);
      await playlist.save();
    }

    await playlist.populate("songs");
    res.json(playlist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi thêm bài hát vào playlist" });
  }
};


exports.removeSongFromPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist không tồn tại" });
    }

    const index = playlist.songs.findIndex(
      (s) => s.toString() === songId.toString()
    );

    if (index === -1) {
      return res.status(404).json({ message: "Bài hát không tồn tại trong playlist" });
    }

    playlist.songs.splice(index, 1);
    await playlist.save();

    res.json({ message: "Đã xóa bài hát khỏi playlist", playlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi xóa bài hát khỏi playlist" });
  }
};