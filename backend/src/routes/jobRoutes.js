const express = require("express");
const { getAllJobs } = require("../controllers/jobController");

const router = express.Router();

router.get("/", getAllJobs);

module.exports = router;
