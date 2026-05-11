import { ReactElement } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import authReducer, { AuthUser } from "../features/authSlice";
import ProtectedRoute from "../routes/ProtectedRoute";
import AdminRoute from "../routes/AdminRoute";

type AuthTestState = {
    token: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;
};

type RenderOptions = {
    initialPath: string;
    authState: AuthTestState;
};

const createAuthState = (overrides: Partial<AuthTestState> = {}): AuthTestState => ({
    token: null,
    user: null,
    isAuthenticated: false,
    ...overrides,
});

const createUser = (role: string): AuthUser => ({
    uid: role === "admin" ? "admin-1" : "user-1",
    name: role === "admin" ? "Admin User" : "Normal User",
    email: role === "admin" ? "admin@example.com" : "user@example.com",
    phone_number: "0780000000",
    role,
});

const renderWithStoreAndRouter = (
    routeTree: ReactElement,
    { initialPath, authState }: RenderOptions
) => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
        },
        preloadedState: {
            auth: authState,
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialPath]}>
                {routeTree}
            </MemoryRouter>
        </Provider>
    );
};

describe("Route guards", () => {
    afterEach(() => {
        localStorage.clear();
    });

    // Tests that ProtectedRoute renders nested protected content for authenticated users.
    it("renders protected content when the user is authenticated", () => {
        renderWithStoreAndRouter(
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<div>Protected dashboard</div>} />
                </Route>
                <Route path="/auth" element={<div>Auth page</div>} />
            </Routes>,
            {
                initialPath: "/dashboard",
                authState: createAuthState({
                    token: "user-token",
                    user: createUser("user"),
                    isAuthenticated: true,
                }),
            }
        );

        expect(screen.getByText("Protected dashboard")).toBeInTheDocument();
    });

    // Tests that ProtectedRoute redirects unauthenticated users to the auth page.
    it("redirects unauthenticated users to /auth", () => {
        renderWithStoreAndRouter(
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<div>Protected dashboard</div>} />
                </Route>
                <Route path="/auth" element={<div>Auth page</div>} />
            </Routes>,
            {
                initialPath: "/dashboard",
                authState: createAuthState(),
            }
        );

        expect(screen.getByText("Auth page")).toBeInTheDocument();
        expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
    });

    // Tests that AdminRoute renders nested admin content for authenticated admin users.
    it("renders admin content for authenticated admin users", () => {
        renderWithStoreAndRouter(
            <Routes>
                <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<div>Admin dashboard</div>} />
                </Route>
                <Route path="/auth" element={<div>Auth page</div>} />
                <Route path="/" element={<div>Home page</div>} />
            </Routes>,
            {
                initialPath: "/admin",
                authState: createAuthState({
                    token: "admin-token",
                    user: createUser("admin"),
                    isAuthenticated: true,
                }),
            }
        );

        expect(screen.getByText("Admin dashboard")).toBeInTheDocument();
    });

    // Tests that AdminRoute redirects unauthenticated users to the auth page.
    it("redirects unauthenticated admin route access to /auth", () => {
        renderWithStoreAndRouter(
            <Routes>
                <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<div>Admin dashboard</div>} />
                </Route>
                <Route path="/auth" element={<div>Auth page</div>} />
                <Route path="/" element={<div>Home page</div>} />
            </Routes>,
            {
                initialPath: "/admin",
                authState: createAuthState(),
            }
        );

        expect(screen.getByText("Auth page")).toBeInTheDocument();
        expect(screen.queryByText("Admin dashboard")).not.toBeInTheDocument();
    });

    // Tests that AdminRoute redirects authenticated non-admin users back to the home page.
    it("redirects authenticated non-admin users to /", () => {
        renderWithStoreAndRouter(
            <Routes>
                <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<div>Admin dashboard</div>} />
                </Route>
                <Route path="/auth" element={<div>Auth page</div>} />
                <Route path="/" element={<div>Home page</div>} />
            </Routes>,
            {
                initialPath: "/admin",
                authState: createAuthState({
                    token: "user-token",
                    user: createUser("user"),
                    isAuthenticated: true,
                }),
            }
        );

        expect(screen.getByText("Home page")).toBeInTheDocument();
        expect(screen.queryByText("Admin dashboard")).not.toBeInTheDocument();
    });
});
