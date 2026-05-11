import apiClient, { getApiErrorMessage } from "./apiClient";
import { Job, JobFilters } from "../features/jobsSlice";

export type JobPayload = Omit<Job, "uid" | "created_at" | "updated_at">;

export type FetchJobsResponse = {
  message: string;
  jobs: Job[];
};

export type JobMutationResponse = {
  message: string;
};

export type CreateJobResponse = {
  message: string;
  job: Job;
};

export const fetchJobs = async (
  filters: Partial<JobFilters> = {}
): Promise<FetchJobsResponse> => {
  try {
    const response = await apiClient.get<FetchJobsResponse>("/jobs", {
      params: filters,
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to fetch jobs."));
  }
};

export const createJob = async (
  jobData: JobPayload
): Promise<CreateJobResponse> => {
  try {
    const response = await apiClient.post<CreateJobResponse>("/jobs", jobData);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to create job."));
  }
};

export const updateJob = async (
  jobUid: string,
  jobData: Partial<JobPayload>
): Promise<JobMutationResponse> => {
  try {
    const response = await apiClient.patch<JobMutationResponse>(
      `/jobs/${jobUid}`,
      jobData
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update job."));
  }
};

export const deleteJob = async (
  jobUid: string
): Promise<JobMutationResponse> => {
  try {
    const response = await apiClient.delete<JobMutationResponse>(
      `/jobs/${jobUid}`
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete job."));
  }
};
