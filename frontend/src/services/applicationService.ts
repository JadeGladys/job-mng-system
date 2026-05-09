import apiClient, { getApiErrorMessage } from "./apiClient";

export type ApplicationStatus = "draft" | "pending" | "rejected" | "shortlisted";

export type ApplicationRecord = {
    uid: string;
    cover_letter_file_link: string;
    cv_link: string;
    status: ApplicationStatus;
    ai_score: number | null;
    ai_summary: string | null;
    ai_recommendation: string | null;
    created_at: string;
    updated_at: string;
    job_uid: string;
    title: string;
    location: string;
    category: string;
    job_type: string;
    work_mode: string;
    company: string;
    description: string;
    requirements: string;
    applicant_uid: string;
    applicant_name: string;
    applicant_email: string;
    applicant_phone_number: string;
};

export type ApplicationFilters = {
    status?: string;
    title?: string;
    location?: string;
    category?: string;
    job_type?: string;
    work_mode?: string;
};

export type ApplicationsResponse = {
    message: string;
    applications: ApplicationRecord[];
};

export type CreateApplicationResponse = {
    message: string;
    application: {
        uid: string;
        job_uid: string;
        cover_letter_file_link: string;
        cv_link: string;
        status: "draft";
    };
};

export type ActionResponse = {
    message: string;
};

export const fetchMyApplications = async (
    filters: ApplicationFilters = {}
): Promise<ApplicationsResponse> => {
    try {
        const response = await apiClient.get<ApplicationsResponse>("/applications/me", {
            params: filters,
        });

        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to fetch your applications."));
    }
};

export const createApplicationDraft = async (
    formData: FormData
): Promise<CreateApplicationResponse> => {
    try {
        const response = await apiClient.post<CreateApplicationResponse>("/applications", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create application draft."));
    }
};

export const updateApplicationDraft = async (
    applicationUid: string,
    formData: FormData
): Promise<ActionResponse> => {
    try {
        const response = await apiClient.patch<ActionResponse>(
            `/applications/${applicationUid}`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update application draft."));
    }
};

export const submitApplication = async (
    applicationUid: string,
    formData: FormData
): Promise<ActionResponse> => {
    try {
        const response = await apiClient.post<ActionResponse>(
            `/applications/${applicationUid}/submit`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to submit application."));
    }
};
