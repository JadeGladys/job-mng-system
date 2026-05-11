import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AuthUser = {
    uid: string;
    name: string;
    email: string;
    phone_number: string;
    role: string;
};

type AuthState = {
    token: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;
};

type CredentialsPayload = {
    token: string;
    user: AuthUser;
};

const getStoredAuth = (): AuthState => {
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
        const user = JSON.parse(storedUser) as AuthUser;

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
        setCredentials: (state, action: PayloadAction<CredentialsPayload>) => {
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
