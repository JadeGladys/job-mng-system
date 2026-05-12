import express from "express";
import {
    getAllUsers,
    getAuthenticatedUser,
    loginUser,
    registerUser,
    deleteUser,
} from "../controllers/authController";
import authenticateToken from "../middleware/authMiddleware";
import authorizeRoles from "../middleware/authorizeRoles"

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/users", authenticateToken, authorizeRoles("admin"), getAllUsers);

router.get("/me", authenticateToken, getAuthenticatedUser);

router.delete("/users/:uid", authenticateToken, deleteUser);

export default router;
