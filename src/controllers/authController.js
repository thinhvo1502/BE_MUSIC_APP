const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
// tạo access token (ngắn hạn)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};
// tạo refresh token (dài hạn)
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};
// [post] /api/auth/refresh-token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "No token provided" });
  try {
    // kiểm tra fresh token hợp lệ
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(payload.id);

    if (!user || !user.refreshToken.some((t) => t.token === refreshToken)) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    res.status(400).json({ message: "Invalid fresh token" });
  }
};
// [post] /api/auth/logout
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "No token provided" });
  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(payload.id);

    if (!user) return res.status(400).json({ message: "Invalid token" });

    user.refreshToken = user.refreshToken.filter(
      (t) => t.token !== refreshToken
    );
    await user.save();
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(400).json({ message: "Invalid fresh token" });
  }
};
// [post] /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ username, email, password });
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken.push({ token: refreshToken });
    await user.save();
    res.status(201).json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
};

// [post] /api/auth/login

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: email }, { username: email }],
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.loginCount = (user.loginCount || 0) + 1;

    user.refreshToken.push({ token: refreshToken });
    await user.save();
    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};

// [get] /api/auth/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("playlists");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile" });
  }
};
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken)
      return res.status(400).json({ message: "idToken is required" });
    // verify idToken with google
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      idToken
    )}`;
    const { data } = await axios.get(verifyUrl);
    // ensure token is for our app
    if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ message: "Invalid id token audience" });
    }
    const email = data.email;
    const name = data.name || "";
    const picture = data.picture || "";
    let user = await User.fineOne({ email });
    if (!user) {
      // create unique username from email
      const base =
        email
          .split("@")[0]
          .replace(/[^\w.-]/g, "")
          .toLowerCase() || "user";
      let username = base;
      let i = 0;
      while (await User.findOne({ username })) {
        i++;
        username = `${base}${i}`;
      }
      //create user with random password
      user = await User.create({
        username,
        email,
        password: Math.random().toString(36).slice(2),
        avatar: picture,
      });
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    // store refresh token
    user.refreshToken = user.refreshToken || [];
    user.refreshToken.push({ token: refreshToken });
    await user.save();
    res.json({
      message: "Google login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("googleLogin error", err.message || err);
    res
      .status(400)
      .json({ message: "Google login failed", error: err.message || err });
  }
};

// [PUT] /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, avatar } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        username,
        avatar,
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Update failed" });
  }
};
