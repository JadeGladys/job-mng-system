import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchJobs } from "../services/jobService";

export const getJobs = createAsyncThunk(
    "jobs/getJobs",
    async (filters = {}, thunkAPI) => {
        try {
            const data = await fetchJobs(filters);
            return data.jobs ?? [];
        } catch (error) {
            return thunkAPI.rejectWithValue(error.message || "Failed to fetch jobs.");
        }
    }
);

const initialState = {
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
        setFilters: (state, action) => {
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
        setSelectedJob: (state, action) => {
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
                state.error = action.payload || "Failed to fetch jobs.";
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
