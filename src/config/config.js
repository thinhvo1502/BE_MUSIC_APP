require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 5000,
    JAMENDO_CLIENT_ID: process.env.JAMENDO_CLIENT_ID,
    JAMENDO_BASE_URL: "https://api.jamendo.com/v3.0",
    IMAGE_SIZE: 400,
    LIMIT: 20,
};