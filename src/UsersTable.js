import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // 🚀 LOAD USERS
  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  // 🔍 SEARCH
  const filteredUsers = users.filter(user =>
    user.login?.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 PAGINATION
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 FETCH FULL USER
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

  // ❌ HIDDEN FIELDS
  const hiddenFields = [
    "groups","vendors","userMobileApps","isMobileDeviceTracking",
    "trakeyeType","deviceIdentifier","resetKey",
    "trakeyeTypeAttributeValues","vendor"
  ];

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
            <th>Email</th>
            <th>Status</th>
            <th>Reporting To</th>
            <th>Geofences</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((user, i) => (
            <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>

              <td>{user.login}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>

              <td>
                <span style={{
                  color: user.activated ? "green" : "red",
                  fontWeight: "bold"
                }}>
                  {user.activated ? "Active" : "Inactive"}
                </span>
              </td>

              <td>{user.reportingTo}</td>

              {/* 🔥 GEOFENCE FRONT PAGE */}
              <td>
                {user.geofenceNames && user.geofenceNames.length > 3 ? (
                  <details>
                    <summary>{user.geofenceNames.slice(0, 3).join(", ")}</summary>
                    {user.geofenceNames.map((g, idx) => (
                      <div key={idx}>{g}</div>
                    ))}
                  </details>
                ) : (
                  user.geofenceNames?.join(", ")
                )}
              </td>

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

            <div style={styles.scrollBox}>
              <table style={styles.detailTable}>
                <tbody>

                  {Object.entries(selectedUser).map(([key, value]) => {

                    if (hiddenFields.includes(key)) return null;

                    // ✅ Activated
                    if (key === "activated") {
                      return (
                        <tr key={key}>
                          <td style={styles.key}>activated</td>
                          <td style={{
                            color: value ? "green" : "red",
                            fontWeight: "bold"
                          }}>
                            {value ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      );
                    }

                    // ✅ Reporting To
                    if (key === "ownedBy") {
                      return (
                        <tr key={key}>
                          <td style={styles.key}>reportingTo</td>
                          <td>
                            {value?.map((u, i) => (
                              <div key={i}>{u.login}</div>
                            ))}
                          </td>
                        </tr>
                      );
                    }

                    // 🔥 GEOFENCE MODAL
                    if (key === "geofenceNames") {
                      return (
                        <tr key={key}>
                          <td style={styles.key}>geofenceNames</td>
                          <td>
                            {value && value.length > 3 ? (
                              <details>
                                <summary>{value.slice(0, 3).join(", ")}</summary>
                                {value.map((g, i) => (
                                  <div key={i}>{g}</div>
                                ))}
                              </details>
                            ) : (
                              value?.join(", ")
                            )}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={key}>
                        <td style={styles.key}>{key}</td>
                        <td>
                          {Array.isArray(value)
                            ? value.join(", ")
                            : typeof value === "object"
                            ? JSON.stringify(value)
                            : value?.toString()}
                        </td>
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>

            <button onClick={() => setSelectedUser(null)} style={styles.closeBtn}>
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

// 🎨 STYLES
const styles = {
  page: { padding: "20px", maxWidth: "1200px", margin: "auto" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  search: { padding: "8px", width: "250px" },
  downloadBtn: { background: "#3b82f6", color: "white", padding: "8px", border: "none", borderRadius: "6px" },
  table: { width: "100%", borderCollapse: "collapse" },
  row: { borderBottom: "1px solid #ddd", cursor: "pointer" },
  pagination: { marginTop: "10px", textAlign: "center" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" },
  modal: { background: "white", padding: "20px", width: "600px", borderRadius: "10px" },
  scrollBox: { maxHeight: "400px", overflowY: "auto" },
  detailTable: { width: "100%" },
  key: { fontWeight: "bold", width: "40%" },
  closeBtn: { background: "#ef4444", color: "white", padding: "8px", border: "none", borderRadius: "6px" }
};

export default UsersTable;