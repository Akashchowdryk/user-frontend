import React, { useEffect, useState } from "react";
import axios from "axios";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data));
  }, []);

  return (
    <div>

      <h2>User Dashboard</h2>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Login</th>
            <th>Name</th>
            <th>Phone</th> {/* 🔥 CHANGED */}
            <th>Status</th>
            <th>Reporting To</th>
            <th>Roles</th>
            <th>Geofences</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user, i) => (
            <tr key={i} onClick={() => {
              axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
                .then(res => setSelectedUser(res.data));
            }}>

              <td>{user.login}</td>
              <td>{user.name}</td>
              <td>{user.phone}</td> {/* 🔥 HERE */}

              <td style={{
                color: user.activated ? "green" : "red"
              }}>
                {user.activated ? "Active" : "Inactive"}
              </td>

              <td>{user.reportingTo}</td>

              <td onClick={(e) => e.stopPropagation()}>
                {user.roles?.length > 2 ? (
                  <details>
                    <summary>{user.roles.slice(0, 2).join(", ")}</summary>
                    {user.roles.map((r, i) => <div key={i}>{r}</div>)}
                  </details>
                ) : user.roles?.join(", ")}
              </td>

              <td onClick={(e) => e.stopPropagation()}>
                {user.geofenceNames?.length > 2 ? (
                  <details>
                    <summary>{user.geofenceNames.slice(0, 2).join(", ")}</summary>
                    {user.geofenceNames.map((g, i) => <div key={i}>{g}</div>)}
                  </details>
                ) : user.geofenceNames?.join(", ")}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {selectedUser && (
        <div style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)"
        }}>
          <div style={{
            background: "white",
            margin: "50px auto",
            padding: "20px",
            width: "60%"
          }}>

            <h3>User Details</h3>

            <pre>{JSON.stringify(selectedUser, null, 2)}</pre>

            <button onClick={() => setSelectedUser(null)}>Close</button>

          </div>
        </div>
      )}

    </div>
  );
}

export default UsersTable;