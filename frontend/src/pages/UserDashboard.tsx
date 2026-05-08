import { useSelector } from "react-redux";
import { RootState } from "../app/store";

function UserDashboard() {
    const user = useSelector((state: RootState) => state.auth.user);

    return (
        <div>
            <h1>User Dashboard</h1>
            <p>Welcome, {user?.name || "User"}.</p>
        </div>
    );
}

export default UserDashboard;
