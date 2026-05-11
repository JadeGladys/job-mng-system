import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    ActionResponse,
    AdminReviewStatus,
    ApplicationFilters,
    ApplicationRecord,
    createApplicationDraft as createApplicationDraftRequest,
    CreateApplicationResponse,
    fetchAllApplications,
    fetchMyApplications,
    submitApplication as submitApplicationRequest,
    updateAdminApplicationStatus as updateAdminApplicationStatusRequest,
    updateApplicationDraft as updateApplicationDraftRequest,
} from "../services/applicationService";

type ApplicationMutationArgs = {
    applicationUid: string;
    formData: FormData;
};

type AdminStatusUpdateArgs = {
    applicationUid: string;
    status: AdminReviewStatus;
};

type ApplicationsState = {
    items: ApplicationRecord[];
    adminItems: ApplicationRecord[];
    filters: ApplicationFilters;
    adminFilters: ApplicationFilters;
    loading: boolean;
    adminLoading: boolean;
    error: string;
    adminError: string;
    actionLoading: boolean;
    actionError: string;
    actionMessage: string;
    adminActionLoading: boolean;
    adminActionError: string;
    adminActionMessage: string;
};

export const loadMyApplications = createAsyncThunk(
    "applications/loadMyApplications",
    async (filters: ApplicationFilters = {}, thunkAPI) => {
        try {
            const response = await fetchMyApplications(filters);
            return {
                applications: response.applications,
                filters,
            };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch your applications.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const createDraft = createAsyncThunk(
    "applications/createDraft",
    async (formData: FormData, thunkAPI) => {
        try {
            return await createApplicationDraftRequest(formData);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create application draft.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const updateDraft = createAsyncThunk(
    "applications/updateDraft",
    async ({ applicationUid, formData }: ApplicationMutationArgs, thunkAPI) => {
        try {
            return await updateApplicationDraftRequest(applicationUid, formData);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update application draft.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const submitDraft = createAsyncThunk(
    "applications/submitDraft",
    async ({ applicationUid, formData }: ApplicationMutationArgs, thunkAPI) => {
        try {
            return await submitApplicationRequest(applicationUid, formData);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to submit application.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const loadAdminApplications = createAsyncThunk(
    "applications/loadAdminApplications",
    async (filters: ApplicationFilters = {}, thunkAPI) => {
        try {
            const response = await fetchAllApplications(filters);
            return {
                applications: response.applications,
                filters,
            };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch applications.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const updateAdminStatus = createAsyncThunk(
    "applications/updateAdminStatus",
    async ({ applicationUid, status }: AdminStatusUpdateArgs, thunkAPI) => {
        try {
            const response = await updateAdminApplicationStatusRequest(applicationUid, status);

            return {
                ...response,
                applicationUid,
                status,
            };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update application status.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

const initialState: ApplicationsState = {
    items: [],
    adminItems: [],
    filters: {},
    adminFilters: {},
    loading: false,
    adminLoading: false,
    error: "",
    adminError: "",
    actionLoading: false,
    actionError: "",
    actionMessage: "",
    adminActionLoading: false,
    adminActionError: "",
    adminActionMessage: "",
};

const setActionPending = (state: ApplicationsState) => {
    state.actionLoading = true;
    state.actionError = "";
    state.actionMessage = "";
};

const setActionRejected = (
    state: ApplicationsState,
    action: PayloadAction<unknown>
) => {
    state.actionLoading = false;
    state.actionError =
        typeof action.payload === "string"
            ? action.payload
            : "Application action failed.";
};

const setActionFulfilled = (
    state: ApplicationsState,
    action: PayloadAction<CreateApplicationResponse | ActionResponse>
) => {
    state.actionLoading = false;
    state.actionError = "";
    state.actionMessage = action.payload.message;
};

const setAdminActionPending = (state: ApplicationsState) => {
    state.adminActionLoading = true;
    state.adminActionError = "";
    state.adminActionMessage = "";
};

const setAdminActionRejected = (
    state: ApplicationsState,
    action: PayloadAction<unknown>
) => {
    state.adminActionLoading = false;
    state.adminActionError =
        typeof action.payload === "string"
            ? action.payload
            : "Admin application action failed.";
};

const applicationsSlice = createSlice({
    name: "applications",
    initialState,
    reducers: {
        setApplicationFilters: (state, action: PayloadAction<ApplicationFilters>) => {
            state.filters = action.payload;
        },
        clearApplicationFilters: (state) => {
            state.filters = {};
        },
        setAdminApplicationFilters: (state, action: PayloadAction<ApplicationFilters>) => {
            state.adminFilters = action.payload;
        },
        clearAdminApplicationFilters: (state) => {
            state.adminFilters = {};
        },
        clearApplicationFeedback: (state) => {
            state.actionError = "";
            state.actionMessage = "";
        },
        clearAdminApplicationFeedback: (state) => {
            state.adminActionError = "";
            state.adminActionMessage = "";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadMyApplications.pending, (state) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(loadMyApplications.fulfilled, (state, action) => {
                state.loading = false;
                state.error = "";
                state.items = action.payload.applications;
                state.filters = action.payload.filters;
            })
            .addCase(loadMyApplications.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    typeof action.payload === "string"
                        ? action.payload
                        : "Failed to fetch your applications.";
            })
            .addCase(loadAdminApplications.pending, (state) => {
                state.adminLoading = true;
                state.adminError = "";
            })
            .addCase(loadAdminApplications.fulfilled, (state, action) => {
                state.adminLoading = false;
                state.adminError = "";
                state.adminItems = action.payload.applications;
                state.adminFilters = action.payload.filters;
            })
            .addCase(loadAdminApplications.rejected, (state, action) => {
                state.adminLoading = false;
                state.adminError =
                    typeof action.payload === "string"
                        ? action.payload
                        : "Failed to fetch applications.";
            })
            .addCase(createDraft.pending, setActionPending)
            .addCase(createDraft.fulfilled, setActionFulfilled)
            .addCase(createDraft.rejected, setActionRejected)
            .addCase(updateDraft.pending, setActionPending)
            .addCase(updateDraft.fulfilled, setActionFulfilled)
            .addCase(updateDraft.rejected, setActionRejected)
            .addCase(submitDraft.pending, setActionPending)
            .addCase(submitDraft.fulfilled, setActionFulfilled)
            .addCase(submitDraft.rejected, setActionRejected)
            .addCase(updateAdminStatus.pending, setAdminActionPending)
            .addCase(updateAdminStatus.fulfilled, (state, action) => {
                state.adminActionLoading = false;
                state.adminActionError = "";
                state.adminActionMessage = action.payload.message;
                state.adminItems = state.adminItems.map((application) =>
                    application.uid === action.payload.applicationUid
                        ? {
                              ...application,
                              status: action.payload.status,
                          }
                        : application
                );
            })
            .addCase(updateAdminStatus.rejected, setAdminActionRejected)
            ;
    },
});

export const {
    clearApplicationFeedback,
    clearApplicationFilters,
    clearAdminApplicationFeedback,
    clearAdminApplicationFilters,
    setApplicationFilters,
    setAdminApplicationFilters,
} = applicationsSlice.actions;
export default applicationsSlice.reducer;
