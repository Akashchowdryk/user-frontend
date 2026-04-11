import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const getUsersPerPage = () => {
    if (window.innerWidth < 600) return 5;
    if (window.innerWidth < 1024) return 8;
    return 10;
  };

  const [usersPerPage, setUsersPerPage] = useState(getUsersPerPage());

  useEffect(() => {
    const handleResize = () => setUsersPerPage(getUsersPerPage());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🔥 Load users
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

  // 🔥 Fetch user details
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

  // ⬇ Download Single User
  const downloadSingleUser = () => {
    const ws = XLSX.utils.json_to_sheet([selectedUser]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `user_${selectedUser.id}.xlsx`);
  };

  // ❌ Fields to hide
  const hiddenFields = [
    "langKey","geofences","groups","vendors","userMobileApps",
    "imei","gpsimei","deviceIdentifier","operatingSystem",
    "resetKey","userImage","trakeyeType","trakeyeTypeAttributeValues","vendor"
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
      <div style={styles.tableWrapper}>
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

            <h2>User Details</h2>

            <div style={styles.scrollBox}>
              <table style={styles.detailTable}>
                <tbody>

                  {Object.entries(selectedUser).map(([key, value]) => {

                    if (hiddenFields.includes(key)) return null;

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

                          /* ✅ GEOFENCE */
                          : key === "geofenceNames" ? (
                            value?.length > 0 ? (
                              value.map((geo, i) => (
                                <div key={i} style={styles.geo}>{geo}</div>
                              ))
                            ) : "No Geofence"
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
            </div>

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
  page: { padding: "20px", fontFamily: "Arial" },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    flexWrap: "wrap"
  },

  search: {
    padding: "8px",
    minWidth: "200px"
  },

  downloadBtn: {
    background: "#3b82f6",
    color: "white",
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px"
  },

  tableWrapper: { overflowX: "auto" },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "600px"
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
    width: "90%",
    maxWidth: "700px",
    maxHeight: "80vh",
    borderRadius: "10px"
  },

  scrollBox: {
    maxHeight: "400px",
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

  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px"
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