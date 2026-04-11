import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showGeofence, setShowGeofence] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/all-users")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  // 🔍 Search
  const filteredUsers = users.filter(user => {
    const text = search.toLowerCase();
    return (
      user.login?.toLowerCase().includes(text) ||
      user.id?.toString().includes(text)
    );
  });

  // 📄 Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 Click user
  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data))
      .catch(err => console.error(err));
  };

  // ⬇ Download All
  const downloadAll = () => {
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users.xlsx");
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

      {/* ✅ TABLE FIXED */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Login</th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((user, i) => (
            <tr key={i} onClick={() => handleUserClick(user)} style={styles.row}>
              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>
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

      {/* MAIN MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2>User Details</h2>

            <table style={styles.detailTable}>
              <tbody>

                {Object.entries(selectedUser).map(([key, value]) => {

                  // ❌ REMOVE FIELDS
                  if ([
                    "ownedBy","langKey","geofences","groups","vendors",
                    "userMobileApps","imei","gpsimei","deviceIdentifier",
                    "operatingSystem","resetKey","userImage",
                    "trakeyeType","trakeyeTypeAttributeValues","vendor"
                  ].includes(key)) return null;

                  return (
                    <tr key={key}>
                      <td style={styles.key}>{key}</td>

                      <td>

                        {/* ✅ AUTHORITIES */}
                        {key === "authorities" ? (
                          value.map((role, i) => (
                            <div key={i} style={styles.tag}>{role}</div>
                          ))
                        )

                        /* ✅ GEOFENCE BUTTON */
                        : key === "geofenceNames" ? (
                          <>
                            <button
                              style={styles.viewBtn}
                              onClick={() => setShowGeofence(true)}
                            >
                              View
                            </button>

                            {/* SUB MODAL */}
                            {showGeofence && (
                              <div style={styles.overlay}>
                                <div style={styles.subModal}>
                                  <h3>Geofences</h3>

                                  <div style={styles.scrollBox}>
                                    {value?.length > 0 ? (
                                      value.map((g, i) => (
                                        <div key={i} style={styles.geo}>{g}</div>
                                      ))
                                    ) : (
                                      <p>No Geofence</p>
                                    )}
                                  </div>

                                  <button onClick={() => setShowGeofence(false)}>
                                    Close
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )

                        : typeof value === "object"
                        ? JSON.stringify(value)
                        : value?.toString()
                        }

                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>

            <button onClick={() => setSelectedUser(null)}>Close</button>

          </div>
        </div>
      )}

    </div>
  );
}

// 🎨 STYLES (FIXED WIDTH + ALIGNMENT)
const styles = {
  page: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "auto"
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px"
  },

  search: {
    padding: "8px",
    width: "250px"
  },

  downloadBtn: {
    background: "#3b82f6",
    color: "white",
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed"
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

  subModal: {
    background: "white",
    padding: "20px",
    width: "400px",
    borderRadius: "10px"
  },

  scrollBox: {
    maxHeight: "300px",
    overflowY: "auto"
  },

  detailTable: {
    width: "100%",
    borderCollapse: "collapse"
  },

  key: {
    fontWeight: "bold",
    width: "40%"
  },

  tag: {
    background: "#eef2ff",
    marginBottom: "5px",
    padding: "5px",
    borderRadius: "6px"
  },

  geo: {
    background: "#e0f2fe",
    marginBottom: "5px",
    padding: "5px",
    borderRadius: "6px"
  },

  viewBtn: {
    background: "#6366f1",
    color: "white",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "none"
  }
};

export default UsersTable;