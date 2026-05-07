import apiClient, { getApiErrorMessage } from "./apiClient";

export const fetchJobs = async (filters = {}) => {
  try {
    const response = await apiClient.get("/jobs", {
      params: filters,
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to fetch jobs."));
  }
};

export const createJob = async (jobData) => {
  try {
    const response = await apiClient.post("/jobs", jobData);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to create job."));
  }
};

export const updateJob = async (jobUid, jobData) => {
  try {
    const response = await apiClient.patch(`/jobs/${jobUid}`, jobData);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update job."));
  }
};

export const deleteJob = async (jobUid) => {
  try {
    const response = await apiClient.delete(`/jobs/${jobUid}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete job."));
  }
};
