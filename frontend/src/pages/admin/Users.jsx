import UserManagement from "../../components/UserManagement";
import UserBackground from "../../components/UserBackground";

export default function AdminUsersPage() {
  return (
    <div className="page" style={{ position: "relative" }}>
      <UserBackground />
      <div className="page-head" style={{ position: "relative", zIndex: 1 }}>
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Users</h1>
          <p className="muted">Add, edit, delete users and assign roles.</p>
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <UserManagement />
      </div>
    </div>
  );
}
