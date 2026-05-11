import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    AiScreeningResponse,
    AiScreeningResult,
    runAiScreening as runAiScreeningRequest,
} from "../services/aiScreeningService";

type AiScreeningState = {
    resultsByApplicationUid: Record<string, AiScreeningResult>;
    loading: boolean;
    error: string;
    message: string;
};

export const runAiScreening = createAsyncThunk(
    "AiScreening/runAiScreening",
    async (applicationUid: string, thunkAPI) => {
        try {
            return await runAiScreeningRequest(applicationUid);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to run AI screening.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

const initialState: AiScreeningState = {
    resultsByApplicationUid: {},
    loading: false,
    error: "",
    message: "",
};

const AiScreeningSlice = createSlice({
    name: "AiScreening",
    initialState,
    reducers: {
        clearAiScreeningFeedback: (state) => {
            state.error = "";
            state.message = "";
        },
        clearAiScreeningResults: (state) => {
            state.resultsByApplicationUid = {};
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(runAiScreening.pending, (state) => {
                state.loading = true;
                state.error = "";
                state.message = "";
            })
            .addCase(
                runAiScreening.fulfilled,
                (state, action: PayloadAction<AiScreeningResponse>) => {
                    state.loading = false;
                    state.error = "";
                    state.message = action.payload.message;
                    state.resultsByApplicationUid[action.payload.screening.application_uid] =
                        action.payload.screening;
                }
            )
            .addCase(runAiScreening.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    typeof action.payload === "string"
                        ? action.payload
                        : "Failed to run AI screening.";
            });
    },
});

export const { clearAiScreeningFeedback, clearAiScreeningResults } =
    AiScreeningSlice.actions;

export default AiScreeningSlice.reducer;
