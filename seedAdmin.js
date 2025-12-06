// seedAdmin.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./src/models/User"); // Đảm bảo đường dẫn đúng tới file Model User

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔥 Connected to MongoDB");

    const adminEmail = "admin@example.com";
    const adminPassword = "123456";
    const adminUsername = "Admin";

    // 1. Check xem admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("⚠️ Admin account already exists!");
      process.exit();
    }

    // 2. Tạo Admin mới
    const admin = new User({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword, 
      role: "admin", 
      avatar: "https://labelle.vn/wp-content/uploads/2025/04/hinh-avatar-dep-1.jpeg",
      playlists: [],
      likedSongs: []
    });

    await admin.save();
    console.log(" Admin created successfully!");
    console.log(` Email: ${adminEmail}`);
    console.log(` Pass: ${adminPassword}`);

    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

createAdmin();