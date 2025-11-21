const History = require('../models/History');

// [POST] api/history
const addHistory = async ( req, res ) => {
    try {
        const { userId, songId } = req.body;
        
        if ( !userId || !songId ) {
            return res.status(400).json({
                success: false,
                message: "Thieu userId || songId",
            });
        }

        const history = new History({ 
            user: userId,
            song: songId,
        });
        await history.save();

        res.status(201).json({
            success: true,
            message: "Da luu lich su nghe nhac",
            data: history,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
};

const getUserHistory = async ( req, res ) => {
    try {
    const { userId } = req.params;

    const histories = await History.find({ user: userId })
      .populate({
          path: "song",
          select: "title artist album duration cover url",
          populate: [
              { path: "artist", select: "name artist_id avatar" },
              { path: "album", select: "title" }
          ]
      })
      .sort({ listen_at: -1 });

    res.status(200).json({ success: true, count: histories.length, data: histories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/history/:userId
const clearUserHistory = async ( req, res ) => {
    try {
        const { userId } = req.params;
        await History.deleteMany({ user: userId });

        res.status(200).json({
            success: true,
            message: "Da xoa toan bo lich su nghe nhac"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = { addHistory, getUserHistory, clearUserHistory };