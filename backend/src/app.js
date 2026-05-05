const express = require("express")
const db = require("./config/database")

const app = express();
const PORT = 5050;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Job Management System backend is running",
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});