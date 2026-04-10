import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedField, setExpandedField] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    axios.get("http://localhost:8080/api/all-users")
      .then(res => setUsers(res.data))
      .catch(err => console.log(err));
  }, []);

  // 🔍 Search
  const filteredUsers = users.filter(user => {
    const text = search.toLowerCase();
    return (
      user.id?.toString().includes(text) ||
      user.firstName?.toLowerCase().includes(text) ||
      user.lastName?.toLowerCase().includes(text) ||
      user.login?.toLowerCase().includes(text) ||
      user.email?.toLowerCase().includes(text)
    );
  });

  // 📄 Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // ⬇ Download All
  const downloadAllUsers = () => {
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "all_users.xlsx");
  };

  // ⬇ Download Single
  const downloadSingleUser = () => {
    const ws = XLSX.utils.json_to_sheet([selectedUser]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `user_${selectedUser.id}.xlsx`);
  };

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>User Management</h1>

        <div style={styles.actions}>
          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.search}
          />

          <button onClick={downloadAllUsers} style={styles.primaryBtn}>
            Download All
          </button>
        </div>
      </div>

      {/* CARD TABLE */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th>ID</th>
              <th>User</th>
              <th>Email</th>
              <th>Roles</th>
            </tr>
          </thead>

          <tbody>
            {currentUsers.map((user, i) => (
              <tr key={i} style={styles.row} onClick={() => setSelectedUser(user)}>
                <td>{user.id}</td>

                <td>
                  <div>
                    <div style={styles.name}>
                      {user.firstName || user.lastName
                        ? `${user.firstName || ""} ${user.lastName || ""}`
                        : "N/A"}
                    </div>
                    <div style={styles.login}>{user.login}</div>
                  </div>
                </td>

                <td>{user.email || "N/A"}</td>

                <td>
                  {user.authorities?.map((role, idx) => (
                    <div key={idx} style={styles.role}>
                      {role}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

            <div style={styles.modalHeader}>
              <h3>User Details</h3>

              <div>
                <button onClick={downloadSingleUser} style={styles.secondaryBtn}>
                  Download
                </button>

                <button onClick={() => setSelectedUser(null)} style={styles.closeBtn}>
                  ✖
                </button>
              </div>
            </div>

            <div style={styles.modalBody}>
              {Object.entries(selectedUser).map(([key, value]) => {

                const isObject = typeof value === "object";

                return (
                  <div key={key} style={styles.detailRow}>

                    <strong>{key}</strong>

                    <div style={styles.value}>
                      {(key === "ownedBy" || key === "trakeyeType") && isObject ? (
                        <>
                          <button
                            onClick={() =>
                              setExpandedField(expandedField === key ? null : key)
                            }
                            style={styles.expandBtn}
                          >
                            {expandedField === key ? "Hide" : "View"}
                          </button>

                          {expandedField === key && (
                            <pre style={styles.jsonBox}>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          )}
                        </>
                      ) : isObject ? (
                        JSON.stringify(value)
                      ) : (
                        value?.toString()
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// 🎨 METALAB STYLE
const styles = {

  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    padding: "30px",
    fontFamily: "Inter"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px"
  },

  title: {
    fontSize: "28px",
    fontWeight: "600"
  },

  actions: {
    display: "flex",
    gap: "10px"
  },

  search: {
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd"
  },

  primaryBtn: {
    background: "linear-gradient(135deg, #6366f1, #3b82f6)",
    color: "white",
    padding: "10px 15px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer"
  },

  card: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  thead: {
    textAlign: "left",
    borderBottom: "2px solid #eee"
  },

  row: {
    borderBottom: "1px solid #eee",
    cursor: "pointer",
    transition: "0.2s"
  },

  name: {
    fontWeight: "600"
  },

  login: {
    fontSize: "12px",
    color: "#888"
  },

  role: {
    background: "#eef2ff",
    padding: "4px 8px",
    borderRadius: "8px",
    marginBottom: "4px"
  },

  pagination: {
    marginTop: "15px",
    display: "flex",
    justifyContent: "center",
    gap: "10px"
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
    width: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
    borderRadius: "16px",
    padding: "20px"
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between"
  },

  modalBody: {
    marginTop: "10px"
  },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px",
    borderBottom: "1px solid #eee"
  },

  value: {
    maxWidth: "60%",
    wordBreak: "break-word"
  },

  expandBtn: {
    background: "#3b82f6",
    color: "white",
    padding: "4px 8px",
    borderRadius: "6px"
  },

  jsonBox: {
    background: "#f1f5f9",
    padding: "10px",
    marginTop: "5px",
    borderRadius: "8px"
  },

  secondaryBtn: {
    background: "#10b981",
    color: "white",
    padding: "6px 10px",
    borderRadius: "6px"
  },

  closeBtn: {
    background: "#ef4444",
    color: "white",
    padding: "6px 10px",
    borderRadius: "6px"
  }
};

export default UsersTable;