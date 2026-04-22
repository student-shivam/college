import { useState } from "react";
import UserManagement from "../../components/UserManagement";

export default function AdminUsersPage() {
  const [error, setError] = useState("");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Users</h1>
          <p className="muted">Add, edit, delete users and assign roles.</p>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}
      <UserManagement onError={setError} />
    </div>
  );
}

