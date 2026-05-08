import apiClient, { getApiErrorMessage } from "./apiClient";

export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Registration failed."));
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Login failed."));
  }
};
