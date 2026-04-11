import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
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
      user.login?.toLowerCase().includes(text) ||
      user.id?.toString().includes(text)
    );
  });

  // 📄 PAGINATION
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 CLICK USER → LOAD GEOFENCE
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

  // ⬇ DOWNLOAD
  const downloadAll = () => {
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users.xlsx");
  };

  return (
    <div style={styles.container}>

      <h1>User Dashboard</h1>

      <div style={styles.topBar}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <button onClick={downloadAll}>Download</button>
      </div>

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
              <>
                <p><strong>Login:</strong> {selectedUser.login}</p>

                <p><strong>Geofences:</strong></p>
                {selectedUser.geofenceNames?.length > 0 ? (
                  selectedUser.geofenceNames.map((g, i) => (
                    <div key={i} style={styles.geo}>{g}</div>
                  ))
                ) : (
                  <p>No Geofence</p>
                )}
              </>
            )}

            <button onClick={() => setSelectedUser(null)}>Close</button>

          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { padding: "20px" },
  table: { width: "100%" },
  row: { cursor: "pointer" },
  topBar: { marginBottom: "10px" },
  pagination: { marginTop: "10px" },
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
    width: "300px"
  },
  geo: {
    background: "#e0f2fe",
    padding: "5px",
    margin: "3px"
  }
};

export default UsersTable;