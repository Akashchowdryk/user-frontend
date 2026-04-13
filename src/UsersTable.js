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

  // 🚀 FAST SUMMARY API
  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  // 🔍 Search
  const filteredUsers = users.filter(user =>
    user.login?.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 CLICK USER → FETCH FULL DETAILS
  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data))
      .catch(err => console.error(err));
  };

  // ⬇ DOWNLOAD ALL
  const downloadAll = () => {
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users.xlsx");
  };

  // ⬇ DOWNLOAD SINGLE USER
  const downloadSingleUser = () => {
    const ws = XLSX.utils.json_to_sheet([selectedUser]);
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
          onChange={(e) => setSearch(e.target.value)}
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
            <th>ID</th>
            <th>Login</th>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Reporting To</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((user, i) => (
            <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>

              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>

              <td>
                <span style={{
                  color: user.activated === true ? "green" : "red",
                  fontWeight: "bold"
                }}>
                  {user.activated === true ? "Active" : "Inactive"}
                </span>
              </td>

              <td>{user.reportingTo}</td>

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

            <pre style={styles.jsonBox}>
              {JSON.stringify(selectedUser, null, 2)}
            </pre>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
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
  page: { padding: "20px", maxWidth: "1200px", margin: "auto" },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px"
  },

  search: { padding: "8px", width: "250px" },

  downloadBtn: {
    background: "#3b82f6",
    color: "white",
    padding: "8px",
    border: "none",
    borderRadius: "6px"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  row: {
    borderBottom: "1px solid #ddd",
    cursor: "pointer"
  },

  pagination: {
    marginTop: "10px",
    textAlign: "center"
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modal: {
    background: "white",
    padding: "20px",
    width: "600px",
    borderRadius: "10px"
  },

  jsonBox: {
    maxHeight: "400px",
    overflowY: "auto",
    background: "#f1f5f9",
    padding: "10px"
  },

  closeBtn: {
    background: "#ef4444",
    color: "white",
    padding: "8px",
    border: "none",
    borderRadius: "6px"
  }
};

export default UsersTable;