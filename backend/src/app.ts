import dotenv from "dotenv";
import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import initializeDatabase from "./schema/init";
import authRoutes from "./routes/authRoutes";
import jobRoutes from "./routes/jobRoutes";
import applicationRoutes from "./routes/applicationRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

initializeDatabase();

app.get("/", (_req: Request, res: Response) => {
    res.json({
        message: "Job Management System backend is running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
