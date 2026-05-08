import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchJobs } from "../services/jobService";

export type JobFilters = {
    title: string;
    location: string;
    category: string;
    job_type: string;
    work_mode: string;
};

export type Job = {
    uid: string;
    title: string;
    description: string;
    location: string;
    company: string;
    category: string;
    job_type: string;
    work_mode: string;
    requirements: string;
    deadline: string;
    created_at?: string;
    updated_at?: string;
};

type JobsState = {
    items: Job[];
    loading: boolean;
    error: string;
    filters: JobFilters;
    selectedJob: Job | null;
};

export const getJobs = createAsyncThunk(
    "jobs/getJobs",
    async (filters: Partial<JobFilters> = {}, thunkAPI) => {
        try {
            const data = await fetchJobs(filters);
            return data.jobs ?? [];
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to fetch jobs.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

const initialState: JobsState = {
    items: [],
    loading: false,
    error: "",
    filters: {
        title: "",
        location: "",
        category: "",
        job_type: "",
        work_mode: "",
    },
    selectedJob: null,
};

const jobsSlice = createSlice({
    name: "jobs",
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<JobFilters>) => {
            state.filters = action.payload;
        },
        clearFilters: (state) => {
            state.filters = {
                title: "",
                location: "",
                category: "",
                job_type: "",
                work_mode: "",
            };
        },
        setSelectedJob: (state, action: PayloadAction<Job>) => {
            state.selectedJob = action.payload;
        },
        clearSelectedJob: (state) => {
            state.selectedJob = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getJobs.pending, (state) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(getJobs.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(getJobs.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    typeof action.payload === "string"
                        ? action.payload
                        : "Failed to fetch jobs.";
            });
    },
});

export const {
    setFilters,
    clearFilters,
    setSelectedJob,
    clearSelectedJob,
} = jobsSlice.actions;

export default jobsSlice.reducer;
