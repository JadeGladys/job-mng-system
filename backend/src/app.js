require("dotenv").config();

const express = require("express");
const initializeDatabase = require("./schema/init");
const authRoutes = require("./routes/authRoutes");
const authenticateToken = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());

initializeDatabase();

app.get("/", (req, res) => {
    res.json({
        message: "Job Management System backend is running",
    });
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.status(200).json({
        message: "Authenticated user fetched successfully.",
        user: req.user,
    });
});

