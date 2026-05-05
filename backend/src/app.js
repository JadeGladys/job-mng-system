require("dotenv").config();

const express = require("express");
const initializeDatabase = require("./schema/init");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());

initializeDatabase();

app.get("/", (req, res) => {
    res.json({
        message: "Job Management System backend is running",
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
