import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [userDetailsMap, setUserDetailsMap] = useState({});
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showGeofence, setShowGeofence] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // 🔥 Load users
  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  // 🔥 Fetch details (for status + reporting)
  useEffect(() => {

    const fetchDetails = async () => {
      const details = {};

      for (let user of users) {
        try {
          const res = await axios.get(
            `https://user-extract.onrender.com/api/user/${user.login}`
          );
          details[user.login] = res.data;
        } catch {
          details[user.login] = null;
        }
      }

      setUserDetailsMap(details);
    };

    if (users.length > 0) {
      fetchDetails();
    }

  }, [users]);

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

  // 🔥 Fetch user details for modal
  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data))
      .catch(err => console.error(err));
  };

  // ⬇ DOWNLOAD ALL
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
            ReportingTo: data.ownedBy?.map(u => u.login).join(", ") || ""
          };

        } catch {
          return {
            ID: user.id,
            Login: user.login,
            Name: `${user.firstName || ""} ${user.lastName || ""}`,
            Email: user.email,
            Activated: "ERROR",
            ReportingTo: "ERROR"
          };
        }
      })
    );

    const ws = XLSX.utils.json_to_sheet(detailedUsers);
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
      <table style={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Login</th>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Reporting To</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((user, i) => {

            const detail = userDetailsMap[user.login];

            return (
              <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>

                <td>{user.id}</td>
                <td>{user.login}</td>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>

                {/* STATUS */}
                <td>
                  {detail ? (
                    <span style={{
                      color: detail.activated ? "green" : "red",
                      fontWeight: "bold"
                    }}>
                      {detail.activated ? "Active" : "Inactive"}
                    </span>
                  ) : (
                    <div style={styles.loader}></div>
                  )}
                </td>

                {/* REPORTING TO */}
                <td>
                  {detail ? (
                    detail.ownedBy?.map(u => u.login).join(", ") || "-"
                  ) : (
                    <div style={styles.loader}></div>
                  )}
                </td>

              </tr>
            );
          })}
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

            <pre style={styles.jsonBox}>
              {JSON.stringify(selectedUser, null, 2)}
            </pre>

            <button onClick={() => setSelectedUser(null)}>Close</button>

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

  jsonBox: {
    maxHeight: "400px",
    overflowY: "auto",
    background: "#f1f5f9",
    padding: "10px"
  },

  loader: {
    width: "16px",
    height: "16px",
    border: "3px solid #ddd",
    borderTop: "3px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  }
};

export default UsersTable;