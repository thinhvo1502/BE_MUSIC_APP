const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
  refreshToken,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// đăng ký
router.post("/register", register);
// đăng nhập
router.post("/login", login);
// lấy thông tin cá nhân
router.get("/profile", protect, getProfile);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

module.exports = router;
