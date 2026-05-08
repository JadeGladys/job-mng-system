const express = require("express");
const {
    getAllJobs,
    createJob,
    updateJob,
    deleteJob,
} = require("../controllers/jobController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.get("/", getAllJobs);

router.post("/", authenticateToken, authorizeRoles("admin"), createJob);
router.patch("/:uid", authenticateToken, authorizeRoles("admin"), updateJob);
router.delete("/:uid", authenticateToken, authorizeRoles("admin"), deleteJob);

module.exports = router;
