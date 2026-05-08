import { Request, Response } from "express";
import authService from "../services/authService";

type ServiceError = Error & {
    status?: number;
    originalError?: Error;
};

const registerUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.registerUser(req.body);
        return res.status(201).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to register user.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const loginUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.loginUser(req.body);
        return res.status(200).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to log in user.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const getAuthenticatedUser = (req: Request, res: Response) => {
    return res.status(200).json({
        message: "Authenticated user fetched successfully.",
        user: req.user,
    });
};

export {
    registerUser,
    loginUser,
    getAuthenticatedUser,
};
