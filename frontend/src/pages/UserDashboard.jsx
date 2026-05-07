import { useSelector } from "react-redux";

function UserDashboard() {
    const user = useSelector((state) => state.auth.user);

    return (
        <div>
            <h1>User Dashboard</h1>
            <p>Welcome, {user?.name || "User"}.</p>
        </div>
    );
}

export default UserDashboard;
