const axios = require("axios");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const JAMENDO_API = "https://api.jamendo.com/v3.0";
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error("JAMENDO_CLIENT_ID is not set in environment variables");
}


async function getJamendoTracks({ limit = 10, search = "" }, specificId = null) {
  let url = `${JAMENDO_API}/tracks/?client_id=${CLIENT_ID}&format=json&include=musicinfo+stats+lyrics&audioformat=mp31`;


  if (specificId) {
    url += `&id=${specificId}`;
  } 
  
  else {
    url += `&limit=${limit}&offset=0`; 
    if (search) {
        url += `&namesearch=${encodeURIComponent(search)}`;
    } else {
        url += `&featured=1&lang=en`; 
    }
  }

  try {
    const data = await axios.get(url);
    return data.data.results || [];
  } catch (error) {
    console.error("Error fetching Jamendo tracks:", error.message);
    return [];
  }
}

async function getJamendoArtists(artistName) {
  const url = `https://api.jamendo.com/v3.0/artists/?client_id=${CLIENT_ID}&format=json&name=${encodeURIComponent(artistName)}`;
  try {
      const artistRes = await axios.get(url);
      return artistRes.data.results || [];
  } catch (error) {
      console.error("Error fetching Jamendo artists:", error.message);
      return [];
  }
}

module.exports = { getJamendoTracks, getJamendoArtists };