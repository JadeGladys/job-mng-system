function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome, {user.name || "Admin"}.</p>
        </div>
    );
}

export default AdminDashboard;
