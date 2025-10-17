const Artist = require('../models/Artist');
const axios = require('axios');
const { getJamendoArtists } = require('../config/jamendo');

const JAMENDO_API = "https://api.jamendo.com/v3.0";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// GET /api/artists
const getALlArtists = async (req, res) => {
    try {
        const { limit = 10, offset = 0, search = '' } = req.query;

        const url = `${JAMENDO_API}/artists/?client_id=${CLIENT_ID}&format=json&limit=${limit}&offset=${offset}&name=${encodeURIComponent(search)}`;
        const { data } = await axios.get(url);

        if ( !data.results ) {
            return res.status(404).json({
                success: false,
                message: "No artists found",
            });
        }

        const artists = data.results.map(artist =>({
            id: artist.id,
            name: artist.name,
            website: artist.website,
            joindate: artist.joindate,
            image: artist.image,
        }));

        res.json({
            success: true,
            total: data.headers.results_count,
            data: artists,
        });

    } catch (error) {
       res.status(500).json({
        success: false,
        message: "Error fetching artists",
        error: error.message,
       }); 
    }
};

// GET artist by ID
// cái này test postman đang error để tạm đây đi mai t xem lại 
const getArtistById = async (req, res) => {
    try {
        const { id } = req.params;
        const url = `${JAMENDO_API}/artists/?client_id=${CLIENT_ID}&format=json&id=${id}`;

        const { data } = await axios.get(url);

        if ( !data.results || data.results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Artist not found",
            });
        }

        const artist = data.results[0];
        res.json({
            success: true,
            data: {
                id: artist.id,
                name: artist.name,
                website: artist.website,
                joindate: artist.joindate,
                image: artist.image,
                shorturl: artist.shorturl,
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetchung artist",
            error: error.message,
        });
    }
};

module.exports = { getALlArtists, getArtistById };