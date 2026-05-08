import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

type AuthenticatedUser = JwtPayload & {
    id: number;
    uid: string;
    email: string;
    role: string;
};

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. No token provided.",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

        if (typeof decoded === "string") {
            return res.status(401).json({
                message: "Invalid or expired token.",
            });
        }

        req.user = decoded as AuthenticatedUser;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token.",
            error: error instanceof Error ? error.message : "Token verification failed.",
        });
    }
};

export default authenticateToken;
