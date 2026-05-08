import axios from "axios";
import { store } from "../app/store";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token || localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const getApiErrorMessage = (error, fallbackMessage) => {
  return error.response?.data?.message || fallbackMessage;
};

export default apiClient;
