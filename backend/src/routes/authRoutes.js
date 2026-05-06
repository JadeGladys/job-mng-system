const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", authenticateToken, (req, res) => {
    res.status(200).json({
        message: "Authenticated user fetched successfully.",
        user: req.user,
    });
});

module.exports = router;
