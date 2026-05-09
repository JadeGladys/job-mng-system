import express from "express";
import {
    createApplication,
    updateApplication,
    submitApplication,
    getAllApplications,
    getMyApplications,
    deleteApplication,
} from "../controllers/applicationController";
import authenticateToken from "../middleware/authMiddleware";
import authorizeRoles from "../middleware/authorizeRoles";
import uploadApplicationFiles from "../middleware/uploadMiddleware";

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles("admin"), getAllApplications);
router.get("/me", authenticateToken, getMyApplications);

router.post("/", authenticateToken, uploadApplicationFiles, createApplication);
router.patch("/:uid", authenticateToken, uploadApplicationFiles, updateApplication);
router.post("/:uid/submit", authenticateToken, uploadApplicationFiles, submitApplication);
router.delete("/:uid", authenticateToken, deleteApplication);

export default router;
