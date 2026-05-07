import { createSlice } from "@reduxjs/toolkit";

const getStoredAuth = () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
        return {
            token: null,
            user: null,
            isAuthenticated: false,
        };
    }

    try {
        const user = JSON.parse(storedUser);

        return {
            token,
            user,
            isAuthenticated: true,
        };
    } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        return {
            token: null,
            user: null,
            isAuthenticated: false,
        };
    }
};

const initialState = getStoredAuth();

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { token, user } = action.payload;

            state.token = token;
            state.user = user;
            state.isAuthenticated = true;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
        },
        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;

            localStorage.removeItem("token");
            localStorage.removeItem("user");
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
