import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    AdminUserRecord,
    fetchUsers,
    UsersFilters,
} from "../services/authService";

type UsersState = {
    items: AdminUserRecord[];
    filters: UsersFilters;
    loading: boolean;
    error: string;
};

export const loadUsers = createAsyncThunk(
    "users/loadUsers",
    async (filters: UsersFilters = {}, thunkAPI) => {
        try {
            const response = await fetchUsers(filters);
            return {
                users: response.users,
                filters,
            };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to fetch users.";

            return thunkAPI.rejectWithValue(message);
        }
    }
);

const initialState: UsersState = {
    items: [],
    filters: {},
    loading: false,
    error: "",
};

const usersSlice = createSlice({
    name: "users",
    initialState,
    reducers: {
        setUserFilters: (state, action: PayloadAction<UsersFilters>) => {
            state.filters = action.payload;
        },
        clearUserFilters: (state) => {
            state.filters = {};
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadUsers.pending, (state) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(loadUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.error = "";
                state.items = action.payload.users;
                state.filters = action.payload.filters;
            })
            .addCase(loadUsers.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    typeof action.payload === "string"
                        ? action.payload
                        : "Failed to fetch users.";
            });
    },
});

export const { clearUserFilters, setUserFilters } = usersSlice.actions;
export default usersSlice.reducer;
