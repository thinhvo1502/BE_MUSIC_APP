const axios = require("axios");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const JAMENDO_API = "https://api.jamendo.com/v3.0";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error("JAMENDO_CLIENT_ID is not set in environment variables");
}
async function getJamendoTracks({ limit = 10, search = "" }) {
  // const url = `${JAMENDO_API}/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&offset=1&search=${encodeURIComponent(
  //   search
  // )}&include=musicinfo+stats+lyrics&audioformat=mp31`;
  const url = `${JAMENDO_API}/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&include=musicinfo+stats+lyrics&audioformat=mp31&featured=1&lang=en&offset=1`;

  const data = await axios.get(url);
  // console.log(data.data.results);
  return data.data.results;
}

async function getJamendoArtists(artistName) {
  const url = `https://api.jamendo.com/v3.0/artists/?client_id=${
    process.env.JAMENDO_CLIENT_ID
  }&format=json&name=${encodeURIComponent(artistName)}`;
  const artistRes = await axios.get(url);
  return artistRes.data.results;
}
module.exports = { getJamendoTracks, getJamendoArtists };
