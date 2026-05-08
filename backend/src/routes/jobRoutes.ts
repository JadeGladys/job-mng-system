import express from "express";
import {
    createJob,
    deleteJob,
    getAllJobs,
    updateJob,
} from "../controllers/jobController";
import authenticateToken from "../middleware/authMiddleware";
import authorizeRoles from "../middleware/authorizeRoles";

const router = express.Router();

router.get("/", getAllJobs);

router.post("/", authenticateToken, authorizeRoles("admin"), createJob);
router.patch("/:uid", authenticateToken, authorizeRoles("admin"), updateJob);
router.delete("/:uid", authenticateToken, authorizeRoles("admin"), deleteJob);

export default router;
