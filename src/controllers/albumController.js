const axios = require("axios");
const JAMENDO_API = "https://api.jamendo.com/v3.0/albums";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

//GET all albums (có thể search)
const getAlbums = async (req, res) => {
  try {
    const { search } = req.query;
    const url = `${JAMENDO_API}/?client_id=${CLIENT_ID}&format=json&limit=10&namesearch=${search || ""}`;
    const { data } = await axios.get(url);

    const albums = data.results.map((album) => ({
      id: album.id,
      title: album.name,
      artist_name: album.artist_name,
      cover: album.image,
      genre: album.musicinfo?.tags?.genres || [],
      release_date: album.releasedate,
    }));

    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách album", error: error.message });
  }

  
};

//GET album details by ID
const getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${JAMENDO_API}/tracks/?client_id=${CLIENT_ID}&format=json&id=${id}`;
    const { data } = await axios.get(url);

    if (!data.results.length) {
      return res.status(404).json({ message: "Không tìm thấy album" });
    }

    const album = data.results[0];
    const response = {
      id: album.id,
      title: album.name,
      artist_name: album.artist_name,
      cover: album.image,
      genre: album.musicinfo?.tags?.genres || [],
      songs: album.tracks?.map((track) => ({
        id: track.id,
        name: track.name,
        duration: track.duration,
        audio: track.audio,
      })) || [],
      release_date: album.releasedate,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy chi tiết album", error: error.message });
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
    // // filter artists accurately
    // const filteredAlbums = data.results.filter(
    //   (album) => album.artist_name.toLowerCase() === artist.toLowerCase()
    // );

    // // map data res
    // const albums = filteredAlbums.map((album) => ({
    //   id: album.id,
    //   title: album.title,
    //   cover: album.cover,
    //   genre: album.genre,
    //   realse_date: album.realse_date,
    //   artist_name: album.artist_name,
    // }));

    // phan trang sau khi loc
    // const paginatedAlbums = albums.slice(offset, offset + limit);

    // res.json({
    //   success: true,
    //   total: albums.length,
    //   offset: Number(offset),
    //   limit: Number(limit),
    //   search,
    //   data: paginatedAlbums,
    // });

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
