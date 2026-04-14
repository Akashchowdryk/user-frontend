import React, { useEffect, useState } from "react";
import axios from "axios";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);

  // LOAD USERS
  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data))
      .finally(() => setLoading(false));
  }, []);

  // CLICK USER
  const handleUserClick = (user) => {
    setGlobalLoading(true);

    window.scrollTo({ top: 0, behavior: "smooth" });

    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data))
      .finally(() => setGlobalLoading(false));
  };

  return (
    <div style={styles.container}>

      <h1 style={styles.title}>User Dashboard</h1>

      {(loading || globalLoading) && (
        <div style={styles.loader}>⏳ Loading...</div>
      )}

      {/* TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Login</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Roles</th>
              <th>Version</th>
              <th>Reporting To</th>
              <th>Geofences</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u, i) => (
              <tr key={i} style={styles.row} onClick={() => handleUserClick(u)}>

                <td>{u.login}</td>
                <td>{u.name}</td>
                <td>{u.phone}</td>

                <td style={{
                  color: u.activated ? "green" : "red",
                  fontWeight: "bold"
                }}>
                  {u.activated ? "Active" : "Inactive"}
                </td>

                <td>
                  {u.roles?.map((r, i) => <div key={i}>{r}</div>)}
                </td>

                <td>{u.version}</td>

                <td>{u.reportingTo}</td>

                <td onClick={(e) => e.stopPropagation()}>
                  {u.geofenceNames?.length > 2 ? (
                    <details>
                      <summary>{u.geofenceNames.slice(0, 2).join(", ")}</summary>
                      {u.geofenceNames.map((g, i) => <div key={i}>{g}</div>)}
                    </details>
                  ) : u.geofenceNames?.join(", ")}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2 style={styles.modalTitle}>User Details</h2>

            <div style={styles.modalContent}>

              <table style={styles.detailTable}>
                <tbody>

                  <tr><td style={styles.key}>Login</td><td>{selectedUser.login}</td></tr>

                  <tr>
                    <td style={styles.key}>Name</td>
                    <td>{selectedUser.firstName} {selectedUser.lastName}</td>
                  </tr>

                  <tr><td style={styles.key}>Phone</td><td>{selectedUser.phone}</td></tr>

                  <tr>
                    <td style={styles.key}>Status</td>
                    <td style={{
                      color: selectedUser.activated ? "green" : "red",
                      fontWeight: "bold"
                    }}>
                      {selectedUser.activated ? "Active" : "Inactive"}
                    </td>
                  </tr>

                  <tr>
                    <td style={styles.key}>Reporting To</td>
                    <td>{selectedUser.ownedBy?.map(o => o.login).join(", ")}</td>
                  </tr>

                  <tr>
                    <td style={styles.key}>Roles</td>
                    <td>
                      {selectedUser.authorities?.map((r, i) => <div key={i}>{r}</div>)}
                    </td>
                  </tr>

                  <tr>
                    <td style={styles.key}>Version</td>
                    <td>{selectedUser.applicationVersion}</td>
                  </tr>

                  <tr>
                    <td style={styles.key}>Geofences</td>
                    <td>
                      {selectedUser.geofenceNames?.length > 2 ? (
                        <details>
                          <summary>{selectedUser.geofenceNames.slice(0, 2).join(", ")}</summary>
                          {selectedUser.geofenceNames.map((g, i) => <div key={i}>{g}</div>)}
                        </details>
                      ) : selectedUser.geofenceNames?.join(", ")}
                    </td>
                  </tr>

                </tbody>
              </table>

            </div>

            <button
              onClick={() => setSelectedUser(null)}
              style={styles.closeBtn}
            >
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

  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "auto"
  },

  title: {
    textAlign: "center",
    marginBottom: "20px"
  },

  tableWrapper: {
    overflowX: "auto"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  row: {
    cursor: "pointer"
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },

  modal: {
    background: "#fff",
    width: "60%",
    maxHeight: "80vh",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    flexDirection: "column"
  },

  modalTitle: {
    textAlign: "center",
    marginBottom: "10px"
  },

  modalContent: {
    overflowY: "auto",
    maxHeight: "60vh"
  },

  detailTable: {
    width: "100%"
  },

  key: {
    fontWeight: "bold",
    width: "40%",
    padding: "8px"
  },

  closeBtn: {
    marginTop: "10px",
    padding: "10px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },

  loader: {
    textAlign: "center",
    marginBottom: "10px",
    fontWeight: "bold"
  }
};

export default UsersTable;