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