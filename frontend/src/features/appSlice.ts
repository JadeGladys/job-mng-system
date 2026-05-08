import { createSlice } from "@reduxjs/toolkit";

type AppState = {
    initialized: boolean;
};

const initialState: AppState = {
    initialized: true,
};

const appSlice = createSlice({
    name: "app",
    initialState,
    reducers: {},
});

export default appSlice.reducer;
