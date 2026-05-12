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

const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await authService.getAllUsers(req.query);
        return res.status(200).json({
            message: "Users fetched successfully.",
            users,
        });
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to fetch users.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const deleteUser = async (req: Request<{ uid: string }>, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized. User information is missing.",
        });
    }

    try {
        const result = await authService.deleteUser(req.params.uid, req.user);
        return res.status(200).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to delete user.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

export {
    registerUser,
    loginUser,
    getAuthenticatedUser,
    getAllUsers,
    deleteUser,
};
