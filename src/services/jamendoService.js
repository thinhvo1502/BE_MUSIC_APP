const axios = require("axios");
const config = require("../config/config");

const api = axios.create({
    baseURL: config.JAMENDO_BASE_URL,
    params: {
        client_id: config.JAMENDO_CLIENT_ID,
        format: "json",
        imagesize: config.IMAGE_SIZE,
    }
});

class JamendoService {
    
    // --- SỬA LẠI HÀM NÀY: Đổi buzzrate thành popularity_month ---
    static async getAlbums(options = {}) {
        const limit = options.limit || 10;
        // Mặc định là popularity_month, nhưng nếu controller truyền vào cái khác thì dùng cái đó
        const order = options.order || 'popularity_month'; 
        // Thêm tag để lọc theo thể loại (rock, pop, jazz...)
        const tag = options.tag || '';

        const params = {
            limit: limit,
            order: order,
            imagesize: 500
        };

        if (tag) {
            params.tag = tag;
        }

        const res = await api.get('/albums', { params });
        return res.data;
    }

    static async searchAlbums (query, limit = config.LIMIT) {
        const res = await api.get('/albums', {
            params: {
                namesearch: query,
                limit
            }
        });
        return res.data;
    }

    // --- GIỮ NGUYÊN LIMIT: 100 ĐỂ LẤY FULL BÀI TRONG ALBUM ---
    static async getAlbumWithTracks (albumId) {
        const res = await api.get('/albums/tracks', {
            params: {
                id: albumId,
                include: 'musicinfo+licenses',
                limit: 100 // Quan trọng: Lấy tối đa 100 bài
            }
        });
        return res.data;
    }

    static async getAlbumsByArtist (artistId) {
        const { data } = await api.get('/artists/albums', {
            params: {
                id: artistId,
                limit: 100
            }
        });
        return data;
    }
    static async getTopTracksByArtist(artistId, limit = 5) {
        const res = await api.get('/artists/tracks', {
            params: {
                id: artistId,
                order: 'popularity_total', // Sắp xếp theo độ phổ biến
                limit: limit
            }
        });
        return res.data;
}
};

module.exports = JamendoService;