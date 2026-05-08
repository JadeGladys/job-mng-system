import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

function AdminRoute() {
    const { isAuthenticated, user } = useSelector(
        (state: RootState) => state.auth
    );

    if (!isAuthenticated || !user) {
        return <Navigate to="/auth" replace />;
    }

    if (user.role !== "admin") {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default AdminRoute;
