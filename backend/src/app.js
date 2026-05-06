require("dotenv").config();

const express = require("express");
const initializeDatabase = require("./schema/init");
const authRoutes = require("./routes/authRoutes");
const authenticateToken = require("./middleware/authMiddleware");
const authorizeRoles = require("./middleware/authorizeRoles");

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

//temporary routes for testing
//Authentication
app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.status(200).json({
        message: "Authenticated user fetched successfully.",
        user: req.user,
    });
});

//Authorization
app.get("/api/admin/test", authenticateToken, authorizeRoles("admin"), (req, res) => {
    res.status(200).json({
        message: "Admin access granted.",
        user: req.user,
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


