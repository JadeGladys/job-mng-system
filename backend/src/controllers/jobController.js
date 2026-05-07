const jobService = require("../services/jobService");

const getAllJobs = async (req, res) => {
    try {
        const jobs = await jobService.getAllJobs(req.query);
        return res.status(200).json({
            message: "Jobs fetched successfully.",
            jobs,
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Failed to fetch jobs.",
            ...(error.originalError ? { error: error.originalError.message } : {}),
        });
    }
};

const createJob = async (req, res) => {
    try {
        const result = await jobService.createJob(req.body, req.user);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Failed to create job.",
            ...(error.originalError ? { error: error.originalError.message } : {}),
        });
    }
};

const updateJob = async (req, res) => {
    try {
        const result = await jobService.updateJob(req.params.uid, req.body);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Failed to update job.",
            ...(error.originalError ? { error: error.originalError.message } : {}),
        });
    }
};

const deleteJob = async (req, res) => {
    try {
        const result = await jobService.deleteJob(req.params.uid);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Failed to delete job.",
            ...(error.originalError ? { error: error.originalError.message } : {}),
        });
    }
};

module.exports = {
    getAllJobs,
    createJob,
    updateJob,
    deleteJob,
};
