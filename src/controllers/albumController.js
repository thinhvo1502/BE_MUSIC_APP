// controllers/albumController.js
const JamendoService = require('../services/jamendoService');

const getAlbums = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Gọi static method vừa thêm bên Service
    const data = await JamendoService.getAlbums({ limit: Number(limit) });

    if (data.headers.status !== 'success') {
      return res.status(400).json({ success: false, error: 'Lỗi API Jamendo' });
    }

    // Map lại dữ liệu cho gọn gàng (nếu muốn), hoặc trả về raw
    const results = data.results.map(album => ({
        id: album.id,
        name: album.name,
        image: album.image,
        artist_name: album.artist_name,
        releasedate: album.releasedate
    }));

    res.json({
      success: true,
      results: results // hoặc data.results
    });
  } catch (error) {
    console.error('Get albums error:', error.message);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
};

const searchAlbums = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    if (!query?.trim()) {
      return res.status(400).json({ success: false, error: 'Tham số "q" là bắt buộc' });
    }

    const data = await JamendoService.searchAlbums(query.trim(), Number(limit));

    if (data.headers.status !== 'success') {
      return res.status(400).json({ success: false, error: data.headers.error_message || 'Lỗi API' });
    }

    res.json({
      success: true,
      pagination: data.headers,
      results: data.results
    });
  } catch (error) {
    console.error('Search albums error:', error.message);
    res.status(500).json({ success: false, error: 'Không thể kết nối Jamendo' });
  }
};

const getAlbumDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Thiếu album ID' });

    const data = await JamendoService.getAlbumWithTracks(id);

    if (data.headers.status !== 'success' || !data.results[0]) {
      return res.status(404).json({ success: false, error: 'Album không tồn tại' });
    }

    const album = data.results[0];

    res.json({
      success: true,
      album: {
        ...album,
        // zip_download: JamendoService.getAlbumZipUrl(id)
      },
      tracks: album.tracks || []
    });
  } catch (error) {
    console.error('Get album detail error:', error.message);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
};
// thêm đoạn này để tui lấy ảnh album của artist
const getAlbumsByArtist = async (req, res) => {
  try {
    const { artist_id } = req.params;
    if (!artist_id) {
      return res.status(400).json({ success: false, error: 'Thiếu artist_id' });
    }

    const data = await JamendoService.getAlbumsByArtist(artist_id);

    if (data.headers.status !== 'success') {
      return res.status(500).json({ success: false, error: 'Lỗi Jamendo API' });
    }

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy artist' });
    }

    const artist = data.results[0];
    const albums = artist.albums || [];


    const results = albums.map(a => ({
        id: a.id,
        name: a.name,
        releasedate: a.releasedate || null,
        
        image: a.image || artist.image || "https://placehold.co/500x500?text=No+Image" 
    }));

    res.json({
      success: true,
      artist_id: artist.id,
      artist_name: artist.name,
      artist_image: artist.image, // Trả thêm ảnh artist gốc để FE dùng nếu cần
      total_albums: albums.length,
      has_albums: albums.length > 0,
      results: results
    });

  } catch (error) {
    console.error('Error getAlbumsByArtist:', error.message);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
};

module.exports = {
  getAlbums,
  searchAlbums,
  getAlbumDetail,
  getAlbumsByArtist
};