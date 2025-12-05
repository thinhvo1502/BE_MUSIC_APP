const Artist = require('../models/Artist');
const axios = require('axios');
const mongoose = require("mongoose");
// const { getAlbumsByArtistById } = require('../controllers/albumController');
const JamendoService = require('../services/jamendoService');
const { getJamendoArtists } = require('../config/jamendo');

const JAMENDO_API = "https://api.jamendo.com/v3.0";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// GET /api/artists
const getALlArtists = async (req, res) => {
    try {
        const { limit = 10, offset = 0, search = '' } = req.query;

        const url = `${JAMENDO_API}/artists/?client_id=${CLIENT_ID}&format=json&limit=${limit}&offset=${offset}&name=${encodeURIComponent(search)}`;
        const { data } = await axios.get(url);

        const apiArtists = (data?.results || []).map( artist => ({
            id: artist.id,
            artist_id: artist.id,
            name: artist.name,
            website: artist.website || '',
            joindate: artist.joindate || '',
            avatar: artist.image || '',
            source: 'jamendo',
        }));

        const dbArtists = await Artist.find({
            ...(search ? { name: { $regex: search, $options: 'i' } } : {}),
            isDeleted: { $ne: true }  // chỉ lấy những ai chưa bị ẩn
        });

         const localArtists = dbArtists.map(artist => ({
            id: artist._id,
            artist_id: artist.artist_id,
            name: artist.name,
            website: artist.website,
            joindate: artist.joindate,
            avatar: artist.avatar,
            source: 'local',
            bio: artist.bio,
            isDeleted: artist.isDeleted ?? false,
        }));

        const dbMap = localArtists.reduce((acc, artist) => {
            acc[artist.artist_id] = artist;
            return acc;
        }, {});

        const mergedArtist = [
            ...localArtists,
            ...apiArtists.filter(artist => !dbMap[artist.artist_id]),
        ];

        res.status(200).json({
            success: true,
            source: "api + db",
            total: mergedArtist.length,
            data: mergedArtist,
        });

    } catch (error) {
       res.status(500).json({
        success: false,
        message: "Error fetching artists",
        error: error.message,
       }); 
    }
};
// tui thêm hàm này để lấy top tracks của artist
const getArtistTopTracks = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Gọi service (dù truyền 5 nhưng API có thể trả về nhiều hơn)
    const data = await JamendoService.getTopTracksByArtist(id, 5);

    if (data.headers.status !== 'success') {
      return res.status(400).json({ success: false, error: 'Lỗi API Jamendo' });
    }

    // --- SỬA ĐOẠN NÀY ---
    // Thêm .slice(0, 5) để ép buộc chỉ lấy 5 bài đầu tiên
    const tracks = data.results[0]?.tracks
        .slice(0, 5) // <--- CẮT MẢNG TẠI ĐÂY
        .map(track => ({
            id: track.id,
            title: track.name,
            duration: track.duration, 
            image: track.image || track.album_image || "",
            url: track.audio,
            artist: data.results[0].name
        })) || [];
    // --------------------

    res.json({ success: true, tracks });
  } catch (error) {
    console.error("Lỗi getArtistTopTracks:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
// GET artist by ID
// cái này test postman đang error để tạm đây đi mai t xem lại 
const getArtistById = async (req, res) => {
    try {
        const { id } = req.params;

        // validate input ID
        if ( !id ) {
            return res.status(400).json({
                success: false,
                message: "Artist ID is required",
            });
        }

        const url = `${JAMENDO_API}/artists/?client_id=${CLIENT_ID}&format=json&id=${id}`;

        const { data } = await axios.get(url);

        if ( !data.results || !data || data.results.length === 0) {
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
                followers: artist.stats ? artist.stats.fan_count : 0
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

// create artist save to db
const createArtist = async ( req, res ) => {
    try {
        const { artist_id, name } = req.body;

        if ( !artist_id || !name ) {
            return res.status(400).json({
                success: false,
                message: "Artist ID & name are required",
            });
        }

        // check if artist exist in db
        const existingArtist = await Artist.findOne({ artist_id })
        if ( existingArtist ) {
            return res.status(409).json({
                success: false,
                message: "Artist exist in db, can not duplicate",
            });
        }
        
        // check if artist exist in jamendo
        const jamendoArtist = await getJamendoArtists(name);

        if ( jamendoArtist.length > 0 ) {
            return res.status(400).json({
                success: false,
                message: "Artist exist in jamendo",
            });
        }

        const newArtist = new Artist({
            artist_id,
            name,
            bio: '',
            image: '',
            avatar: '',
            website: '',
            joindate: new Date().toString(),
        });
        const savedArtist = await newArtist.save();

        res.status(201).json({
            success: true,
            message: "Artist created successfully",
            data: savedArtist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating artist",
            error: error.message,
        });
    }
};

// PUT artist by ID
const updatedArtist = async ( req, res ) => {
    // console.log("REQ BODY:", req.body);
    try {
        const { id } = req.params;
        const updateData = req.body;

        // id hop le hay khong
        if ( !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid artist ID format",
            });
        }

        const artist = await Artist.findOneAndUpdate(
            { _id: id},
            { $set: updateData},    // $set de update cac field body
            { new: true, runValidators: true},  // runValidators res doc sai update
        );

        if ( !artist ) {
            return res.status(404).json({
                success: false,
                message: "Artist not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Artist updated successfully",
            data: artist,
        });
    } catch (error) {
        res.json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// DELETE chua xong dang de tam day
const deleteArtist = async ( req, res ) => {
    try {
        const { id } = req.params;

        const artist = await Artist.findByIdAndUpdate(
            id, 
            { isDeleted: true },
            { new: true},
        );

        if ( !artist ) {
            return res.status(404).json({
                success: false,
                message: "Artist not found",
            });
        }

        res.json({
            success: true,
            message: "Artist deleted successfully",
            data: artist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting artist",
            error: error.message,
        });
    }
};

module.exports = { getALlArtists, getArtistById, createArtist, updatedArtist, deleteArtist, getArtistTopTracks };