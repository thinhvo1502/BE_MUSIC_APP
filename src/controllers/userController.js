const User = require("../models/User");

// [GET] /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    // Tìm kiếm theo username hoặc email
    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const total = await User.countDocuments(query);
    
    const users = await User.find(query)
      .select("-password") //  Không trả về mật khẩu
      .sort({ createdAt: -1 }) // Người mới nhất lên đầu
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const data = users.map(u => ({
        _id: u._id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        playlistCount: u.playlists.length,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        loginCount: u.loginCount || 0
    }));

    res.json({
      success: true,
      total,
      totalPages: Math.ceil(total / limit),
      page: parseInt(page),
      users: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get users failed" });
  }
};

// [GET] /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("playlists"); 

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Get user failed" });
  }
};

// [DELETE] /api/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
}

// [GET] /api/users/:id/recommendations
exports.getRecommendationsForUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    // 1. Lấy thông tin User và danh sách bài hát đã Like
    const user = await User.findById(id).populate('likedSongs');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let recommendations = [];

    // 2. CASE 1: User chưa like bài nào -> Gợi ý bài hát ngẫu nhiên/hot
    if (!user.likedSongs || user.likedSongs.length === 0) {
      recommendations = await Song.aggregate([
        { $sample: { size: parseInt(limit) } } // Lấy ngẫu nhiên
      ]);
      
      // Populate thông tin artist/album cho đẹp
      recommendations = await Song.populate(recommendations, { path: 'artist album', select: 'name title cover image' });
    } 
    
    // 3. CASE 2: User đã like nhạc -> Gợi ý theo sở thích
    else {
      // Lấy danh sách ID các bài đã like để loại trừ
      const likedSongIds = user.likedSongs.map(s => s._id);
      
      // Lấy danh sách Genre và Artist mà user thích
      const favoriteGenres = [...new Set(user.likedSongs.flatMap(s => s.genre))]; // flatMap để gộp mảng genre nếu 1 bài nhiều genre
      const favoriteArtists = [...new Set(user.likedSongs.map(s => s.artist))];

      // Query tìm bài hát phù hợp
      recommendations = await Song.aggregate([
        { 
          $match: { 
            _id: { $nin: likedSongIds }, // Không lấy bài đã like
            $or: [
              { genre: { $in: favoriteGenres } }, // Cùng thể loại
              { artist: { $in: favoriteArtists } } // Hoặc cùng ca sĩ
            ]
          } 
        },
        { $sample: { size: parseInt(limit) } } // Lấy ngẫu nhiên trong số các bài phù hợp
      ]);

      // Nếu tìm không ra đủ bài (ví dụ gu nhạc dị quá), thì lấy thêm bài ngẫu nhiên bù vào
      if (recommendations.length < limit) {
         const needed = parseInt(limit) - recommendations.length;
         const randomSongs = await Song.aggregate([
            { $match: { _id: { $nin: [...likedSongIds, ...recommendations.map(r => r._id)] } } },
            { $sample: { size: needed } }
         ]);
         recommendations = [...recommendations, ...randomSongs];
      }

      // Populate data
      recommendations = await Song.populate(recommendations, { path: 'artist album', select: 'name title cover image avatar' });
    }

    res.json({
      success: true,
      message: "Personalized recommendations",
      total: recommendations.length,
      recommendations
    });

  } catch (err) {
    console.error("Recommendation Error:", err);
    res.status(500).json({ success: false, message: "Failed to get recommendations" });
  }
};