import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = localStorage.getItem("token");

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    const res = await fetch(`${API}/api/admin/stats`, { headers });
    const data = await res.json();
    setStats(data);
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API}/api/admin/users`, { headers });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const makeAdmin = async (id) => {
    if (!confirm("Make this user ADMIN?")) return;
    await fetch(`${API}/api/admin/users/${id}/make-admin`, { method: "PATCH", headers });
    fetchUsers();
  };

  const removeAdmin = async (id) => {
    if (!confirm("Demote this admin to USER?")) return;
    await fetch(`${API}/api/admin/users/${id}/remove-admin`, { method: "PATCH", headers });
    fetchUsers();
  };

  const deleteUser = async (id) => {
    if (!confirm("DELETE this user permanently?")) return;
    await fetch(`${API}/api/admin/users/${id}`, { method: "DELETE", headers });
    fetchUsers();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ background: "#1a1d2e", borderBottom: "1px solid #2d3748", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "20px", color: "#a78bfa" }}>⚡ Admin Panel</h1>
        <button
          onClick={handleLogout}
          style={{ background: "#2d3748", color: "#e2e8f0", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            {[
              { label: "Total Users", value: stats.stats.totalUsers, color: "#a78bfa" },
              { label: "Admins", value: stats.stats.totalAdmins, color: "#f59e0b" },
              { label: "Interviews", value: stats.stats.totalInterviews, color: "#34d399" },
              { label: "Voice Sessions", value: stats.stats.totalVoiceInterviews, color: "#60a5fa" },
              { label: "Gifts Given", value: stats.stats.totalGifts, color: "#f87171" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#1a1d2e", border: `1px solid ${s.color}33`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          placeholder="🔍 Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", background: "#1a1d2e", border: "1px solid #2d3748", borderRadius: "8px", color: "#e2e8f0", fontSize: "14px", marginBottom: "20px", boxSizing: "border-box" }}
        />

        {/* Users Table */}
        <div style={{ background: "#1a1d2e", borderRadius: "12px", border: "1px solid #2d3748", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f1117", borderBottom: "1px solid #2d3748" }}>
                {["ID", "Name", "Email", "Role", "Verified", "Interviews", "Joined", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading...</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #2d3748" }}>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "13px" }}>#{u.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: "bold" }}>{u.name}</td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: u.role === "ADMIN" ? "#f59e0b22" : "#a78bfa22", color: u.role === "ADMIN" ? "#f59e0b" : "#a78bfa", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: u.isVerified ? "#34d399" : "#f87171" }}>{u.isVerified ? "✓" : "✗"}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{u._count?.interviewSessions ?? 0}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {u.role === "USER" ? (
                        <button onClick={() => makeAdmin(u.id)} style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>
                          Make Admin
                        </button>
                      ) : (
                        <button onClick={() => removeAdmin(u.id)} style={{ background: "#a78bfa22", color: "#a78bfa", border: "1px solid #a78bfa44", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>
                          Demote
                        </button>
                      )}
                      <button onClick={() => deleteUser(u.id)} style={{ background: "#f8717122", color: "#f87171", border: "1px solid #f8717144", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}