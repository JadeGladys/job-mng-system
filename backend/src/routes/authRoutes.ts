import express from "express";
import {
    getAuthenticatedUser,
    loginUser,
    registerUser,
} from "../controllers/authController";
import authenticateToken from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", authenticateToken, getAuthenticatedUser);

export default router;
