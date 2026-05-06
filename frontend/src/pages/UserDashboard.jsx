function UserDashboard() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return (
        <div>
            <h1>User Dashboard</h1>
            <p>Welcome, {user.name || "User"}.</p>
        </div>
    );
}

export default UserDashboard;
