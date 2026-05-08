const express = require("express");
const { registerUser, loginUser, getAuthenticatedUser } = require("../controllers/authController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", authenticateToken, getAuthenticatedUser);

module.exports = router;
