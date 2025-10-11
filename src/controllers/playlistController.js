const axios = require("axios");
const Playlist = require("../models/Playlist");
const Song = require("../models/Song");
const Artist = require("../models/Artist");

// get Spotify access token
async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const response = await axios.post('https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
    }
    );
  return response.data.access_token;
}

exports.getPlaylists = async (req, res) => {
  const playlists = await Playlist.find();
  res.json(playlists);
};

exports.getPlaylist = async (req, res) => {
  const playlist = await Playlist.findById(req.params.id);
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
    const { spotifyId } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist không tồn tại" });
    }

    //  Gọi Spotify API để lấy thông tin bài hát
    const token = await getSpotifyAccessToken();
    const { data } = await axios.get(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Kiểm tra hoặc tạo mới Artist
    const artistName = data.artists[0].name;
    let artist = await Artist.findOne({ name: artistName });

    if (!artist) {
      artist = await Artist.create({ name: artistName });
    }

    // Kiểm tra xem bài hát đã có chưa
    let song = await Song.findOne({ spotifyId: data.id });
    if (!song) {
      song = await Song.create({
        title: data.name,
        spotifyId: data.id,
        cover: data.album.images[0]?.url,
        url: data.preview_url || "https://open.spotify.com/track/" + data.id,  // tránh lỗi "required" khi không có url
        artist: artist._id,
        duration: data.duration_ms,
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

    if ( !playlist ) {
        return res.status(404).json({ message: "Playlist không tồn tại" });
    }

    playlist.songs = playlist.songs.filter(s => s?._id);
    // check song in playlist?
    const index = (playlist.songs || []).findIndex(
        (s) => s._id.toString() === songId.toString()
    );

    if (index == -1) {
        return res.status(404).json({ message: "Bài hát không tồn tại trong Playlist" });
    }

    playlist.songs.splice(index, 1);
    await playlist.save();

    res.json({ message: "Đã xóa bài hát khỏi Playlist", playlist});
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Lỗi khi xóa bài hát khỏi Playlist" });
  }
};