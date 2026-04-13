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

  // ⬇ DOWNLOAD ALL (FULL DATA)
  const downloadAll = async () => {

    const detailedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          const res = await axios.get(
            `https://user-extract.onrender.com/api/user/${user.login}`
          );

          const data = res.data;

          return {
            ID: data.id,
            Login: data.login,
            Name: `${data.firstName || ""} ${data.lastName || ""}`,
            Email: data.email,
            Activated: data.activated ? "Active" : "Inactive",
            ReportingTo: data.ownedBy?.map(u => u.login).join(", ") || "",
            Authorities: data.authorities?.join(", ") || "",
            Geofences: data.geofenceNames?.join(", ") || ""
          };

        } catch (err) {
          return {
            ID: user.id,
            Login: user.login,
            Name: `${user.firstName || ""} ${user.lastName || ""}`,
            Email: user.email,
            Activated: "ERROR",
            ReportingTo: "ERROR",
            Authorities: "ERROR",
            Geofences: "ERROR"
          };
        }
      })
    );

    const ws = XLSX.utils.json_to_sheet(detailedUsers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users_full_data.xlsx");
  };

  // ⬇ DOWNLOAD SINGLE USER
  const downloadSingleUser = () => {
    const data = {
      ID: selectedUser.id,
      Login: selectedUser.login,
      Name: `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`,
      Email: selectedUser.email,
      Activated: selectedUser.activated ? "Active" : "Inactive",
      ReportingTo: selectedUser.ownedBy?.map(u => u.login).join(", ") || "",
      Authorities: selectedUser.authorities?.join(", ") || "",
      Geofences: selectedUser.geofenceNames?.join(", ") || ""
    };

    const ws = XLSX.utils.json_to_sheet([data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `user_${selectedUser.id}.xlsx`);
  };

  // ❌ Hidden fields
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
            <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>
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
                              <div key={i} style={styles.tag}>{u.login}</div>
                            ))}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={key}>
                        <td style={styles.key}>{key}</td>
                        <td>

                          {/* AUTHORITIES */}
                          {key === "authorities" ? (
                            value.map((role, i) => (
                              <div key={i} style={styles.tag}>{role}</div>
                            ))
                          )

                          /* GEOFENCE */
                          : key === "geofenceNames" ? (
                            <>
                              <button
                                style={styles.viewBtn}
                                onClick={() => setShowGeofence(true)}
                              >
                                View
                              </button>

                              {showGeofence && (
                                <div style={styles.overlay}>
                                  <div style={styles.subModal}>
                                    <h3>Geofences</h3>

                                    <div style={styles.scrollBox}>
                                      {value?.map((g, i) => (
                                        <div key={i} style={styles.geo}>{g}</div>
                                      ))}
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
    width: "100%"
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