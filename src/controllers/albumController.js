const axios = require("axios");
const JAMENDO_API = "https://api.jamendo.com/v3.0";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;


const fetchFromJamendo = async (endpoint, params = {}) => {
  const url = new URL(`${JAMENDO_API}${endpoint}`);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("format", "json");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null)  url.searchParams.set(key, value);
  }

  const { data } = await axios.get(url.toString());
  console.log(url.toString());
  return data.results;
};

// GET album (search)
const getAlbums = async (req, res) => {
  try {
    const { search } = req.query;

    const results = await fetchFromJamendo("/", {
      limit: 10,
      nameSearch: search || "",
      include: "musicinfo+stats+tracks+audiodownload",
    });

    const albums = results.map((album) => ({
      id: album.id,
      title: album.name,
      artist_name: album.artist_name,
      artist_id: album.artist_id,
      cover: album.image,
      genre: album.musicinfo?.tags?.genres?.length
        ? album.musicinfo.tags.genres
        : ["Unknown"],
      release_date: album.releasedate,
      album_url: album.shareurl,
      track_count: album.tracks?.length || 0,
      tracks:
        album.tracks?.map((track) => ({
          id: track.id,
          name: track.name,
          duration: track.duration,
          audio: track.audio,
          audiodownload: track.audiodownload,
        })) || [],
      rating: album.stats?.rating || 0,
    }));

    res.json({
      success: true,
      albums: albums.length,
      data: albums,
    });

  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách albums",
      success: false,
      error: error.message,
    });
  }
};

// GET album details by id
const getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;

    // Gọi đúng endpoint Jamendo, có thêm include đầy đủ dữ liệu
    const albumResults = await fetchFromJamendo("/albums", {
      id,
    });

    // Kiểm tra kết quả
    if (!albumResults || albumResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy album với ID đã cho",
      });
    }

    const trackResults = await fetchFromJamendo("/tracks", { album_id : id});

    const album = albumResults[0];
    const response = {
      id: album.id,
      title: album.name,
      artist_id: album.artist_id,
      artist_name: album.artist_name,
      cover: album.image,
      genre: album.musicinfo?.tags?.genres?.length
        ? album.musicinfo.tags.genres
        : ["Unknown"],
      track_count: trackResults.length,
      tracks: trackResults.map(track => ({
        id: track.id,
        name: track.name,
        duration: track.duration,
        audio: track.audio,
      })),
      release_date: album.releasedate,
      album_url: album.shareurl,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết album",
      error: error.message,
    });
  }
};


//GET albums by artist name
const getAlbumsByArtist = async (req, res) => {
  try {
    const {
      artist,
      search = "",
      limit = 10,
      offset = 0,
    } = req.query;

    if ( !artist ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên nghệ sĩ",
      });
    }

    // call api
    const url = `${JAMENDO_API}/?client_id=${CLIENT_ID}&format=json&limit=100&offset=${offset}&artist_name=${encodeURIComponent(
      artist
    )}&namesearch=${encodeURIComponent(search)}`;

    const { data } = await axios.get(url);

    if ( !data.results || data.results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy album nào cho nghệ sĩ này",
      });
    }

    const albums = data.results
      .filter(album => album.artist_name.toLowerCase().includes(search.toLowerCase()))
      .map(album => ({
        id: album.id,
        title: album.title,
        cover: album.cover,
        artist_name: album.artist_name,
        release_date: album.release_date,
        track_count: album.track_count,
        image: album.image,
        genre: album.musicinfo?.tags?.genres || ["Unknows"],
        audiodownload: album.audiodownload,
        shareurl: album.shareurl,
      }));
      
    res.json({
      success: true,
      count: albums.length,
      data: albums,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm album theo nghệ sĩ",
      error: error.message,
    });
  }
};

module.exports = { getAlbums, getAlbumById, getAlbumsByArtist };
