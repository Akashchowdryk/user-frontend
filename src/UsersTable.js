import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [subModalData, setSubModalData] = useState(null);
  const [subModalTitle, setSubModalTitle] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // 📱 Responsive users per page
  const getUsersPerPage = () => {
    if (window.innerWidth < 600) return 5;
    if (window.innerWidth < 1024) return 8;
    return 10;
  };

  const [usersPerPage, setUsersPerPage] = useState(getUsersPerPage());

  // 🔄 Update on resize
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

  // 🔥 Sub modal open
  const openSubModal = (title, data) => {
    setSubModalTitle(title);
    setSubModalData(data);
  };

  // ⬇ Download
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
          Download
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
              <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>
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

      {/* MAIN MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2>User Details</h2>

            <div style={styles.scrollBox}>
              <table style={styles.detailTable}>
                <tbody>

                  {Object.entries(selectedUser).map(([key, value]) => (

                    <tr key={key}>
                      <td style={styles.key}>{key}</td>

                      <td>
                        {(key === "trakeyeType" || key === "trakeyeTypeAttributeValues" || key === "geofenceNames") ? (
                          <button
                            style={styles.viewBtn}
                            onClick={() => openSubModal(key, value)}
                          >
                            View
                          </button>
                        ) : typeof value === "object" ? (
                          JSON.stringify(value)
                        ) : (
                          value?.toString()
                        )}
                      </td>
                    </tr>

                  ))}

                </tbody>
              </table>
            </div>

            <button onClick={() => setSelectedUser(null)}>Close</button>

          </div>
        </div>
      )}

      {/* SUB MODAL */}
      {subModalData && (
        <div style={styles.overlay}>
          <div style={styles.subModal}>

            <h3>{subModalTitle}</h3>

            <div style={styles.scrollBox}>

              {subModalTitle === "geofenceNames" && Array.isArray(subModalData) ? (
                <table style={styles.innerTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Geofence Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subModalData.map((g, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{g}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <pre style={styles.jsonBox}>
                  {JSON.stringify(subModalData, null, 2)}
                </pre>
              )}

            </div>

            <button onClick={() => setSubModalData(null)}>Close</button>

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
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "10px"
  },

  search: {
    padding: "8px",
    flex: "1",
    minWidth: "200px"
  },

  downloadBtn: {
    background: "#3b82f6",
    color: "white",
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px"
  },

  tableWrapper: {
    overflowX: "auto"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "600px"
  },

  row: {
    cursor: "pointer",
    borderBottom: "1px solid #ddd"
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

  subModal: {
    background: "white",
    padding: "20px",
    width: "90%",
    maxWidth: "500px",
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

  viewBtn: {
    background: "#6366f1",
    color: "white",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "none"
  },

  innerTable: {
    width: "100%",
    borderCollapse: "collapse"
  },

  jsonBox: {
    background: "#f1f5f9",
    padding: "10px",
    borderRadius: "6px"
  }
};

export default UsersTable;