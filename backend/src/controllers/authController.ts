const authService = require("../services/authService");

const registerUser = async (req, res) => {
    try {
        const result = await authService.registerUser(req.body);
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Failed to register user.",
            ...(error.originalError ? { error: error.originalError.message } : {}),
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const result = await authService.loginUser(req.body);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Failed to log in user.",
            ...(error.originalError ? { error: error.originalError.message } : {}),
        });
    }
};

const getAuthenticatedUser = (req, res) => {
    return res.status(200).json({
        message: "Authenticated user fetched successfully.",
        user: req.user,
    });
};

module.exports = {
    registerUser,
    loginUser,
    getAuthenticatedUser,
};
