import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCreateJobPage from "./pages/admin/AdminCreateJobPage";
import AdminManageListingsPage from "./pages/admin/AdminManageListingsPage";
import AdminManageUsersPage from "./pages/admin/AdminManageUsersPage";
import AdminManageApplicationsPage from "./pages/admin/AdminManageApplicationsPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import HomePage from "./pages/HomePage";
import JobDetailsPage from "./pages/JobDetailsPage";
import MyApplicationsPage from "./pages/MyApplicationsPage";

type AuthMode = "login" | "register";

function AuthPageSwitcher() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  return authMode === "login" ? (
    <LoginPage onSwitchMode={() => setAuthMode("register")} />
  ) : (
    <RegisterPage onSwitchMode={() => setAuthMode("login")} />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs/:uid" element={<JobDetailsPage />} />
        <Route path="/auth" element={<AuthPageSwitcher />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/my-applications" element={<MyApplicationsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/jobs/create" element={<AdminCreateJobPage />} />
          <Route path="/admin/jobs/manage" element={<AdminManageListingsPage />} />
          <Route path="/admin/users" element={<AdminManageUsersPage />} />
          <Route path="/admin/applications" element={<AdminManageApplicationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
