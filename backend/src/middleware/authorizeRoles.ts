import { NextFunction, Request, Response } from "express";

const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized. User information is missing.",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Forbidden. You do not have permission to access this resource.",
            });
        }

        next();
    };
};

export default authorizeRoles;
