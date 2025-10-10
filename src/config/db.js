const mongoose = require("mongoose");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const connectDB = async () => {
  try {
    // console.log("MONGODB_URI:", process.env.PORT);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
