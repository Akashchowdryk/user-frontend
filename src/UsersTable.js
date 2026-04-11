import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download, Search } from "lucide-react";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedField, setExpandedField] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // 🔥 Fetch user details
  const handleUserClick = (user) => {
    setLoading(true);

    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => {
        setSelectedUser(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
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
        <div>
          <Search size={16} />
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <button onClick={downloadAll}>
          <Download size={16} /> Download
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

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2>User Details</h2>

            {loading ? (
              <p>Loading...</p>
            ) : (
              <div style={styles.scrollBox}>

                <table style={styles.detailTable}>
                  <tbody>

                    {Object.entries(selectedUser).map(([key, value]) => (

                      <tr key={key}>
                        <td style={styles.key}>{key}</td>

                        <td>
                          {key === "geofenceNames" ? (
                            <>
                              <button
                                onClick={() =>
                                  setExpandedField(expandedField === key ? null : key)
                                }
                              >
                                {expandedField === key ? "Hide" : "View"}
                              </button>

                              {expandedField === key && (
                                <div style={styles.geoBox}>
                                  <table style={styles.innerTable}>
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        <th>Geofence</th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {value?.length > 0 ? (
                                        value.map((g, i) => (
                                          <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td>{g}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan="2">No Geofences</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
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
            )}

            <button onClick={() => setSelectedUser(null)}>Close</button>

          </div>
        </div>
      )}

    </div>
  );
}

// 🎨 STYLES
const styles = {
  page: { padding: "20px" },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
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
    width: "600px",
    maxHeight: "80vh"
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
    width: "30%"
  },

  geoBox: {
    marginTop: "10px"
  },

  innerTable: {
    width: "100%",
    borderCollapse: "collapse"
  }
};

export default UsersTable;