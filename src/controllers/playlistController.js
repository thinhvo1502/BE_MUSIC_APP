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

    const resultWithTrackCount = playlists.map(p => ({
      id: p.id,
      name: p.name,
      image: p.image,
      track_count: p.track_count || (p.tracks ? p.tracks.length : 0),
      tracks: p.tracks || []
    }));

    res.json({
      total_playlists: response.data.headers?.results_fullcount || playlists.length,
      playlists: resultWithTrackCount
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Lay Playlists tu Jamendo API that bai",
    });
  }
};

// Get :id khi click vo playlist
exports.getPlaylist = async (req, res) => {
  try {
    const playlistId = req.params.id;
    if (!playlistId) {
      return res.status(400).json({ message: "Thiếu playlist ID" });
    }

    const response = await axios.get(
      `https://api.jamendo.com/v3.0/playlists/tracks/?client_id=${JAMENDO_CLIENT_ID}&id=${playlistId}&format=json`
    );

    const playlist = response.data.results?.[0];
    if ( !playlist ) {
      return res.status(404).json({ message: "Playlist khong ton tai" });
    }
    
    const totalTracks = playlist.tracks?.length || 0;

    res.json({
      id: playlist.id,
      name: playlist.name,
      image: playlist.image,
      track_count: totalTracks,
      tracks: playlist.tracks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Lay playlist chi tiet khong thanh cong',
    })
  }
};

exports.createPlaylist = async (req, res) => {
  try {
    const { name, descripsion, songs } = req.body;

    const newPlaylist = new Playlist({
      name,
      descripsion,
      user: req.user._id,
      songs: songs || []
    });
    await newPlaylist.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { playlists: newPlaylist._id },
    });

    await newPlaylist.populate("songs");

    res.status(201).json({
      success: true,
      data: newPlaylist,
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Create Playlist that bai" });
  }
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