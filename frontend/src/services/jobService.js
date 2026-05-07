import { store } from "../app/store";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/jobs`;

const getAuthHeaders = () => {
  const token = store.getState().auth.token || localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchJobs = async (filters = {}) => {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch jobs.");
  }

  return data;
};

export const createJob = async (jobData) => {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create job.");
  }

  return data;
};

export const updateJob = async (jobUid, jobData) => {
  const response = await fetch(`${API_BASE_URL}/${jobUid}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update job.");
  }

  return data;
};

export const deleteJob = async (jobUid) => {
  const response = await fetch(`${API_BASE_URL}/${jobUid}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete job.");
  }

  return data;
};
