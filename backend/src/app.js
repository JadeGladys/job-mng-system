require("dotenv").config();

const express = require("express");
const cors = require("cors");
const initializeDatabase = require("./schema/init");
const authRoutes = require("./routes/authRoutes");
const authorizeRoles = require("./middleware/authorizeRoles");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

initializeDatabase();

app.get("/", (req, res) => {
    res.json({
        message: "Job Management System backend is running",
    });
});

app.use("/api/auth", authRoutes);

/*temporary admin route for testing
//Authorization
app.get("/api/admin/test", authenticateToken, authorizeRoles("admin"), (req, res) => {
    res.status(200).json({
        message: "Admin access granted.",
        user: req.user,
    });
});*/

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


