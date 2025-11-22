const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
// bảo vệ route, kiểm tra người dùng có gửi token hợp lệ hay không
exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return res.status(401).json({ message: "Not authorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// kiểm tra có phải admin không
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next(); 
  } else {
    res.status(403).json({ message: "Not authorized as an admin" }); 
  }
};