import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download, Search, X } from "lucide-react";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedField, setExpandedField] = useState(null);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // ✅ LOAD USERS FAST
  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/all-users")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  // 🔍 SEARCH
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

  // 📄 PAGINATION
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 CLICK USER → FETCH GEOFENCE
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

  // ⬇ DOWNLOAD ALL
  const downloadAllUsers = () => {
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "all_users.xlsx");
  };

  // ⬇ DOWNLOAD SINGLE
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
        <div style={styles.brand}>
          <img src={process.env.PUBLIC_URL + "/logo.png"} alt="logo" style={styles.logo} />
          <h1>User Dashboard</h1>
        </div>

        <div style={styles.actions}>
          <div style={styles.searchBox}>
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

          <button onClick={downloadAllUsers} style={styles.primaryBtn}>
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Email</th>
              <th>Roles</th>
            </tr>
          </thead>

          <tbody>
            {currentUsers.map((user, i) => (
              <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>
                <td>{user.id}</td>

                <td>
                  {user.firstName} {user.lastName}
                  <br />
                  <small>{user.login}</small>
                </td>

                <td>{user.email}</td>

                <td>
                  {user.authorities?.map((r, idx) => (
                    <div key={idx}>{r}</div>
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
                <button onClick={downloadSingleUser}>Download</button>
                <button onClick={() => setSelectedUser(null)}>Close</button>
              </div>
            </div>

            <div style={styles.modalBody}>

              {loading ? (
                <p>Loading geofences...</p>
              ) : (
                <>
                  <p><strong>Login:</strong> {selectedUser.login}</p>

                  {/* ✅ GEOFENCE TABLE */}
                  <strong>Geofences:</strong>

                  <button
                    onClick={() =>
                      setExpandedField(expandedField === "geo" ? null : "geo")
                    }
                  >
                    {expandedField === "geo" ? "Hide" : "View"}
                  </button>

                  {expandedField === "geo" && (
                    <table style={styles.innerTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Geofence Name</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedUser.geofenceNames?.length > 0 ? (
                          selectedUser.geofenceNames.map((g, i) => (
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
                  )}
                </>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// 🎨 STYLES
const styles = {
  page: { padding: "20px" },
  header: { display: "flex", justifyContent: "space-between" },
  brand: { display: "flex", gap: "10px", alignItems: "center" },
  logo: { height: "40px" },
  actions: { display: "flex", gap: "10px" },
  searchBox: { display: "flex", gap: "5px" },
  primaryBtn: { background: "blue", color: "white" },
  card: { background: "white", marginTop: "20px" },
  table: { width: "100%" },
  row: { cursor: "pointer" },
  pagination: { marginTop: "10px", textAlign: "center" },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  modal: { background: "white", padding: "20px", width: "400px" },
  modalHeader: { display: "flex", justifyContent: "space-between" },
  innerTable: { width: "100%", marginTop: "10px", borderCollapse: "collapse" }
};

export default UsersTable;