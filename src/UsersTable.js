import React, { useEffect, useState } from "react";
import axios from "axios";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

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

  // 📄 PAGINATION LOGIC
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div style={styles.container}>

      <h1>User Dashboard</h1>

      {/* SEARCH */}
      <input
        placeholder="Search by login or ID"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        style={styles.search}
      />

      {/* TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Login</th>
            <th>Name</th>
            <th>Email</th>
            <th>Roles</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((user, i) => (
            <tr key={i} style={styles.row} onClick={() => setSelectedUser(user)}>
              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.firstName} {user.lastName}</td>
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

      {/* PAGINATION */}
      <div style={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>
          Prev
        </button>

        <span> Page {currentPage} / {totalPages} </span>

        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>
          Next
        </button>
      </div>

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <div style={styles.modalHeader}>
              <h2>User Details</h2>
              <button onClick={() => setSelectedUser(null)}>Close</button>
            </div>

            <div style={styles.modalBody}>

              <p><strong>ID:</strong> {selectedUser.id}</p>
              <p><strong>Login:</strong> {selectedUser.login}</p>
              <p><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>

              <p><strong>Roles:</strong></p>
              {selectedUser.authorities?.map((r, i) => (
                <div key={i}>{r}</div>
              ))}

              {/* 🔥 GEOFENCE HERE ONLY */}
              <p><strong>Geofences:</strong></p>

              {selectedUser.geofenceNames?.length > 0 ? (
                selectedUser.geofenceNames.map((geo, i) => (
                  <div key={i} style={styles.geo}>{geo}</div>
                ))
              ) : (
                <p>No Geofences</p>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { padding: "20px", fontFamily: "Arial" },

  search: {
    marginBottom: "10px",
    padding: "8px",
    width: "250px"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  row: {
    borderBottom: "1px solid #ccc",
    cursor: "pointer"
  },

  pagination: {
    marginTop: "10px",
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
    padding: "20px",
    width: "400px",
    borderRadius: "10px"
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between"
  },

  modalBody: {
    marginTop: "10px"
  },

  geo: {
    background: "#e0f2fe",
    padding: "5px",
    marginBottom: "5px",
    borderRadius: "5px"
  }
};

export default UsersTable;