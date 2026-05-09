import { Request, Response } from "express";
import applicationService from "../services/applicationService";

type ServiceError = Error & {
    status?: number;
    originalError?: Error;
};

type ApplicationParams = {
    uid: string;
};

type UploadedFiles = {
    cover_letter_file?: Express.Multer.File[];
};

const getFilePath = (file?: Express.Multer.File): string | undefined => {
    if (!file) {
        return undefined;
    }

    return `/uploads/applications/${file.filename}`;
};

const getAllApplications = async (req: Request, res: Response) => {
    try {
        const applications = await applicationService.getAllApplications(req.query);
        return res.status(200).json({
            message: "Applications fetched successfully.",
            applications,
        });
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to fetch applications.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const getMyApplications = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized. User information is missing.",
        });
    }

    try {
        const applications = await applicationService.getMyApplications(req.user, req.query);

        return res.status(200).json({
            message: "User applications fetched successfully.",
            applications,
        });
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to fetch user applications.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const createApplication = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized. User information is missing.",
        });
    }

    try {
        const files = (req.files as UploadedFiles) || {};

        const result = await applicationService.createApplication(
            {
                job_uid: req.body.job_uid,
                cover_letter_file_link: getFilePath(files.cover_letter_file?.[0]),
                cv_link: req.body.cv_link,
            },
            req.user
        );

        return res.status(201).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to create application.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const updateApplication = async (req: Request<ApplicationParams>, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized. User information is missing.",
        });
    }

    try {
        const files = (req.files as UploadedFiles) || {};

        const result = await applicationService.updateApplication(
            req.params.uid,
            {
                cover_letter_file_link: getFilePath(files.cover_letter_file?.[0]),
                cv_link: req.body.cv_link,
            },
            req.user
        );

        return res.status(200).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to update application.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const submitApplication = async (req: Request<ApplicationParams>, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized. User information is missing.",
        });
    }

    try {
        const files = (req.files as UploadedFiles) || {};

        const result = await applicationService.submitApplication(
            req.params.uid,
            {
                cover_letter_file_link: getFilePath(files.cover_letter_file?.[0]),
                cv_link: req.body.cv_link,
            },
            req.user
        );

        return res.status(200).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to submit application.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

const deleteApplication = async (req: Request<ApplicationParams>, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized. User information is missing.",
        });
    }

    try {
        const result = await applicationService.deleteApplication(req.params.uid, req.user);

        return res.status(200).json(result);
    } catch (error) {
        const serviceError = error as ServiceError;

        return res.status(serviceError.status || 500).json({
            message: serviceError.message || "Failed to delete application.",
            ...(serviceError.originalError
                ? { error: serviceError.originalError.message }
                : {}),
        });
    }
};

export {
    createApplication,
    updateApplication,
    submitApplication,
    getAllApplications,
    getMyApplications,
    deleteApplication,
};
