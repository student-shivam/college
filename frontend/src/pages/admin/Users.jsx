import UserManagement from "../../components/UserManagement";

export default function AdminUsersPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Users</h1>
          <p className="muted">Add, edit, delete users and assign roles.</p>
        </div>
      </div>
      <UserManagement />
    </div>
  );
}
