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
    static async searchAlbums (query, limit = config.LIMIT) {
        const res = await api.get('/albums', {
            params: {
                search: query, limit
            }
        });
        return res.data;
    }

    static async getAlbumWithTracks (albumId) {
        const res = await api.get('/albums/tracks', {
            params: {
                id: albumId,
                include: 'musicinfo+licenses'
            }
        });
        return res.data;
    }

    static async getAlbumsByArtist (artistId) {
        const { data } = await api.get('/artists/albums', {
            params: {
                artist_id: artistId
            }
        });
        return data;
    }
};

module.exports = JamendoService;