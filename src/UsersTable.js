import React, { useEffect, useState } from "react";
import axios from "axios";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/all-users")
      .then(res => {
        console.log("DATA:", res.data);
        setUsers(res.data);
      })
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

  return (
    <div style={styles.container}>

      <h1>User Dashboard</h1>

      <input
        placeholder="Search user..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      <table style={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Login</th>
            <th>Name</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Geofences</th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((user, i) => (
            <tr key={i} style={styles.row}>
              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>

              <td>
                {user.authorities?.map((r, idx) => (
                  <div key={idx}>{r}</div>
                ))}
              </td>

              <td>
                {user.geofenceNames?.length > 0 ? (
                  user.geofenceNames.map((geo, idx) => (
                    <div key={idx} style={styles.geo}>
                      {geo}
                    </div>
                  ))
                ) : (
                  "N/A"
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial"
  },
  search: {
    marginBottom: "10px",
    padding: "8px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  row: {
    borderBottom: "1px solid #ccc"
  },
  geo: {
    background: "#eef",
    marginBottom: "3px",
    padding: "3px"
  }
};

export default UsersTable;