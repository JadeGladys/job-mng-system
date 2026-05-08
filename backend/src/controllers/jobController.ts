import { Request, Response } from "express";
import jobService from "../services/jobService";

type ServiceError = Error & {
    status?: number;
    originalError?: Error;
};

const getAllJobs = async (req: Request, res: Response) => {
    try {
        const jobs = await jobService.getAllJobs(req.query);
        return res.status(200).json({
            message: "Jobs fetched successfully.",
            jobs,
        });
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to fetch jobs.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const createJob = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized. User information is missing.",
        });
    }

    try {
        const result = await jobService.createJob(req.body, req.user);
        return res.status(201).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to create job.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const updateJob = async (req: Request, res: Response) => {
    try {
        const result = await jobService.updateJob(req.params.uid, req.body);
        return res.status(200).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to update job.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const deleteJob = async (req: Request, res: Response) => {
    try {
        const result = await jobService.deleteJob(req.params.uid);
        return res.status(200).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to delete job.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

export {
    getAllJobs,
    createJob,
    updateJob,
    deleteJob,
};
