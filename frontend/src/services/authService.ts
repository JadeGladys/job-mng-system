import apiClient, { getApiErrorMessage } from "./apiClient";
import { AuthUser } from "../features/authSlice";

export type RegisterUserData = {
  name: string;
  email: string;
  phone_number: string;
  password: string;
};

export type RegisterUserResponse = {
  message: string;
  user: AuthUser;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginUserResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

export type UsersFilters = {
  name?: string;
  email?: string;
  role?: string;
};

export type AdminUserRecord = AuthUser & {
  created_at?: string;
  updated_at?: string;
};

export type FetchUsersResponse = {
  message: string;
  users: AdminUserRecord[];
};

export const registerUser = async (
  userData: RegisterUserData
): Promise<RegisterUserResponse> => {
  try {
    const response = await apiClient.post<RegisterUserResponse>(
      "/auth/register",
      userData
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Registration failed."));
  }
};

export const loginUser = async (
  credentials: LoginCredentials
): Promise<LoginUserResponse> => {
  try {
    const response = await apiClient.post<LoginUserResponse>(
      "/auth/login",
      credentials
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Login failed."));
  }
};

export const fetchUsers = async (
  filters: UsersFilters = {}
): Promise<FetchUsersResponse> => {
  try {
    const response = await apiClient.get<FetchUsersResponse>("/auth/users", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to fetch users."));
  }
};
