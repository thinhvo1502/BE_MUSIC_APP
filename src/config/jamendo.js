const axios = require("axios");
require("dotenv").config();

const JAMENDO_API = "https://api.jamendo.com/v3.0";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error("JAMENDO_CLIENT_ID is not set in environment variables");
}
async function getJamendoTracks({ limit = 10, search = "" }) {
  const url = `${JAMENDO_API}/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&search=${encodeURIComponent(
    search
  )}`;
  const data = await axios.get(url);
  return data.results;
}
module.exports = { getJamendoTracks };
