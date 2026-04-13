import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data));
  }, []);

  // 🔍 Search
  const filteredUsers = users.filter(u =>
    u.login?.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 FETCH USER
  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data));
  };

  // 🔥 CLEAN DATA FOR DOWNLOAD
  const formatUser = (data) => ({
    Login: data.login,
    Name: `${data.firstName || ""} ${data.lastName || ""}`,
    Phone: data.phone,
    Status: data.activated ? "Active" : "Inactive",
    ReportingTo: data.ownedBy?.map(u => u.login).join(", "),
    Roles: data.authorities?.join(", "),
    Geofences: data.geofenceNames?.join(", ")
  });

  // ⬇ DOWNLOAD ALL (CLEAN)
  const downloadAll = async () => {

    const detailedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          const res = await axios.get(
            `https://user-extract.onrender.com/api/user/${user.login}`
          );
          return formatUser(res.data);
        } catch {
          return { Login: user.login, Status: "ERROR" };
        }
      })
    );

    const ws = XLSX.utils.json_to_sheet(detailedUsers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users_clean.xlsx");
  };

  // ⬇ DOWNLOAD SINGLE
  const downloadSingleUser = () => {
    const ws = XLSX.utils.json_to_sheet([formatUser(selectedUser)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `user_${selectedUser.login}.xlsx`);
  };

  return (
    <div style={styles.page}>

      <h1>User Dashboard</h1>

      <div style={styles.topBar}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.search}
        />

        <button onClick={downloadAll} style={styles.downloadBtn}>
          Download All
        </button>
      </div>

      {/* TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Login</th>
            <th>Name</th>
            <th>Phone</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((user, i) => (
            <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>
              <td>{user.login}</td>
              <td>{user.name}</td>
              <td>{user.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div style={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Prev</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>Next</button>
      </div>

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2>User Details</h2>

            <table style={styles.detailTable}>
              <tbody>

                <tr>
                  <td style={styles.key}>Login</td>
                  <td>{selectedUser.login}</td>
                </tr>

                <tr>
                  <td style={styles.key}>Name</td>
                  <td>{selectedUser.firstName} {selectedUser.lastName}</td>
                </tr>

                <tr>
                  <td style={styles.key}>Phone</td>
                  <td>{selectedUser.phone}</td>
                </tr>

                <tr>
                  <td style={styles.key}>Status</td>
                  <td style={{
                    color: selectedUser.activated ? "green" : "red",
                    fontWeight: "bold"
                  }}>
                    {selectedUser.activated ? "Active" : "Inactive"}
                  </td>
                </tr>

                <tr>
                  <td style={styles.key}>Reporting To</td>
                  <td>
                    {selectedUser.ownedBy?.map((u, i) => (
                      <div key={i} style={styles.tag}>{u.login}</div>
                    ))}
                  </td>
                </tr>

                <tr>
                  <td style={styles.key}>Roles</td>
                  <td>
                    {selectedUser.authorities?.map((r, i) => (
                      <div key={i} style={styles.tag}>{r}</div>
                    ))}
                  </td>
                </tr>

                <tr>
                  <td style={styles.key}>Geofences</td>
                  <td>
                    {selectedUser.geofenceNames?.map((g, i) => (
                      <div key={i} style={styles.geo}>{g}</div>
                    ))}
                  </td>
                </tr>

              </tbody>
            </table>

            <div style={styles.modalActions}>
              <button onClick={downloadSingleUser} style={styles.downloadBtn}>
                Download User
              </button>

              <button onClick={() => setSelectedUser(null)} style={styles.closeBtn}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// 🎨 STYLES
const styles = {
  page: { padding: "20px", maxWidth: "1000px", margin: "auto" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  search: { padding: "8px", width: "250px" },
  downloadBtn: { background: "#3b82f6", color: "white", padding: "8px", borderRadius: "6px" },
  table: { width: "100%", borderCollapse: "collapse" },
  row: { borderBottom: "1px solid #ddd", cursor: "pointer" },
  pagination: { marginTop: "10px", textAlign: "center" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" },
  modal: { background: "white", padding: "20px", width: "600px", borderRadius: "10px" },
  detailTable: { width: "100%" },
  key: { fontWeight: "bold", width: "40%" },
  tag: { background: "#eef2ff", margin: "3px 0", padding: "5px", borderRadius: "6px" },
  geo: { background: "#e0f2fe", margin: "3px 0", padding: "5px", borderRadius: "6px" },
  modalActions: { display: "flex", justifyContent: "space-between", marginTop: "10px" },
  closeBtn: { background: "#ef4444", color: "white", padding: "8px", borderRadius: "6px" }
};

export default UsersTable;