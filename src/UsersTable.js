import React, { useEffect, useState } from "react";
import axios from "axios";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const usersPerPage = 10;

  // 🚀 SINGLE API CALL
  useEffect(() => {
    axios.get("https://your-backend-url/api/users-summary")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  // 🔍 Search
  const filteredUsers = users.filter(user =>
    user.login?.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div style={styles.page}>

      <h1>User Dashboard</h1>

      <div style={styles.topBar}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
      </div>

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
          {currentUsers.map((user, i) => (
            <tr key={i} style={styles.row}>
              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>

              <td>
                <span style={{
                  color: user.activated === true ? "green" : "red",
                  fontWeight: "bold"
                }}>
                  {user.activated === true ? "Active" : "Inactive"}
                </span>
              </td>

              <td>{user.reportingTo}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Prev</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>Next</button>
      </div>

    </div>
  );
}

const styles = {
  page: { padding: "20px", maxWidth: "1200px", margin: "auto" },
  topBar: { marginBottom: "10px" },
  search: { padding: "8px", width: "250px" },
  table: { width: "100%", borderCollapse: "collapse" },
  row: { borderBottom: "1px solid #ddd" },
  pagination: { marginTop: "10px", textAlign: "center" }
};

export default UsersTable;