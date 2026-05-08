import dotenv from "dotenv";
import cors from "cors";
import express, { Request, Response } from "express";
import initializeDatabase from "./schema/init";
import authRoutes from "./routes/authRoutes";
import jobRoutes from "./routes/jobRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

initializeDatabase();

app.get("/", (_req: Request, res: Response) => {
    res.json({
        message: "Job Management System backend is running",
    });
});

app.use("/api/auth", authRoutes);

app.use("/api/jobs", jobRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

