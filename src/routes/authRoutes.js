const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
  refreshToken,
  logout,
  updateProfile,
  googleLogin,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const passport = require("../utils/passport");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
// bắt đầu đăng nhập, chuyển hướng đến google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
// Callback sau khi Google trả về
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  async (req, res) => {
    try {
      // req.user is the User doc returned by the strategy
      const user = req.user;
      if (!user)
        return res.redirect(process.env.CLIENT_URL || "http://localhost:3000");

      const accessToken = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "7d",
        }
      );

      // persist refresh token
      user.refreshToken = user.refreshToken || [];
      user.refreshToken.push({ token: refreshToken });
      await user.save();

      // Redirect to frontend with tokens (consider using POST-redirect or short-lived code instead)
      const redirectBase = process.env.CLIENT_URL || "http://localhost:3000";
      const redirectUrl = `${redirectBase.replace(
        /\/$/,
        ""
      )}/auth/success?accessToken=${encodeURIComponent(
        accessToken
      )}&refreshToken=${encodeURIComponent(refreshToken)}`;
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error("Google callback error:", err);
      return res.redirect(process.env.CLIENT_URL || "http://localhost:3000");
    }
    // res.redirect("http://localhost:3000/success?token=123");
  }
);
// đăng ký
router.post("/register", register);
// đăng nhập
router.post("/login", login);
router.post("/google", googleLogin);
// lấy thông tin cá nhân
router.get("/profile", protect, getProfile);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
//chỉnh sửa thông tin cá nhân
router.put("/profile", protect, updateProfile);

module.exports = router;
