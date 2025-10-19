const Artist = require('../models/Artist');
const axios = require('axios');
const mongoose = require("mongoose");
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

const deleteArtist = async ( req, res ) => {
    try {
        const { id } = req.params;
        const artist = await Artist.findByIdAndDelete(
            { _id: id},
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
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting artist",
            error: error.message,
        });
    }
};

module.exports = { getALlArtists, getArtistById, createArtist, updatedArtist, deleteArtist };