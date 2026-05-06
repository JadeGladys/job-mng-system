require("dotenv").config();

const express = require("express");
const cors = require("cors");
const initializeDatabase = require("./schema/init");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");

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

app.use("/api/jobs", jobRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


