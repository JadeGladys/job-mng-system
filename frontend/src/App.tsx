import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
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
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/my-applications" element={<MyApplicationsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
