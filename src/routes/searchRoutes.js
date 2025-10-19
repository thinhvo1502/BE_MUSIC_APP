const express = require("express");
const router = express.Router();
const { searchAll, suggest } = require("../controllers/searchController");

router.get("/", searchAll);
router.get("/suggest", suggest); // gợi ý tự động
module.exports = router;
