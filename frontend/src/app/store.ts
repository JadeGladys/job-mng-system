import { configureStore } from "@reduxjs/toolkit";
import appReducer from "../features/appSlice";
import applicationsReducer from "../features/applicationsSlice";
import authReducer from "../features/authSlice";
import jobsReducer from "../features/jobsSlice";
import usersReducer from "../features/usersSlice";

export const store = configureStore({
    reducer: {
        app: appReducer,
        applications: applicationsReducer,
        auth: authReducer,
        jobs: jobsReducer,
        users: usersReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
