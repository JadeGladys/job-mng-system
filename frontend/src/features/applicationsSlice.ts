import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    ActionResponse,
    ApplicationFilters,
    ApplicationRecord,
    createApplicationDraft as createApplicationDraftRequest,
    CreateApplicationResponse,
    fetchMyApplications,
    submitApplication as submitApplicationRequest,
    updateApplicationDraft as updateApplicationDraftRequest,
} from "../services/applicationService";

type ApplicationMutationArgs = {
    applicationUid: string;
    formData: FormData;
};

type ApplicationsState = {
    items: ApplicationRecord[];
    filters: ApplicationFilters;
    loading: boolean;
    error: string;
    actionLoading: boolean;
    actionError: string;
    actionMessage: string;
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

const initialState: ApplicationsState = {
    items: [],
    filters: {},
    loading: false,
    error: "",
    actionLoading: false,
    actionError: "",
    actionMessage: "",
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
        clearApplicationFeedback: (state) => {
            state.actionError = "";
            state.actionMessage = "";
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
            .addCase(createDraft.pending, setActionPending)
            .addCase(createDraft.fulfilled, setActionFulfilled)
            .addCase(createDraft.rejected, setActionRejected)
            .addCase(updateDraft.pending, setActionPending)
            .addCase(updateDraft.fulfilled, setActionFulfilled)
            .addCase(updateDraft.rejected, setActionRejected)
            .addCase(submitDraft.pending, setActionPending)
            .addCase(submitDraft.fulfilled, setActionFulfilled)
            .addCase(submitDraft.rejected, setActionRejected);
    },
});

export const {
    clearApplicationFeedback,
    clearApplicationFilters,
    setApplicationFilters,
} = applicationsSlice.actions;
export default applicationsSlice.reducer;
