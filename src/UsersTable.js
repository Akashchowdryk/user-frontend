import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data));
  }, []);

  // 🔥 DOWNLOAD ALL
  const downloadAll = () => {
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users.xlsx");
  };

  const filteredUsers = users.filter(u =>
    u.login?.toLowerCase().includes(search.toLowerCase())
  );

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

        <button onClick={downloadAll} style={styles.downloadBtn}>
          Download All
        </button>
      </div>

      {/* TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Login</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Reporting To</th>
            <th>Roles</th>
            <th>Geofences</th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((user, i) => (
            <tr key={i} style={styles.row}
                onClick={() => {
                  axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
                    .then(res => setSelectedUser(res.data));
                }}>

              <td>{user.login}</td>
              <td>{user.name}</td>
              <td>{user.phone}</td>

              <td style={{
                color: user.activated ? "green" : "red",
                fontWeight: "bold"
              }}>
                {user.activated ? "Active" : "Inactive"}
              </td>

              <td>{user.reportingTo}</td>

              {/* ROLES */}
              <td onClick={(e) => e.stopPropagation()}>
                {user.roles?.length > 2 ? (
                  <details>
                    <summary>{user.roles.slice(0, 2).join(", ")}</summary>
                    {user.roles.map((r, i) => (
                      <div key={i}>{r}</div>
                    ))}
                  </details>
                ) : user.roles?.map((r, i) => (
                  <div key={i}>{r}</div>
                ))}
              </td>

              {/* GEOFENCE */}
              <td onClick={(e) => e.stopPropagation()}>
                {user.geofenceNames?.length > 2 ? (
                  <details>
                    <summary>{user.geofenceNames.slice(0, 2).join(", ")}</summary>
                    {user.geofenceNames.map((g, i) => (
                      <div key={i}>{g}</div>
                    ))}
                  </details>
                ) : user.geofenceNames?.map((g, i) => (
                  <div key={i}>{g}</div>
                ))}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2>User Details</h2>

            <table style={styles.detailTable}>
              <tbody>

                {Object.entries(selectedUser).map(([key, value]) => {

                  // ❌ HIDE UNWANTED
                  const hide = [
                    "groups","vendors","userMobileApps","trakeyeType",
                    "deviceIdentifier","resetKey","trakeyeTypeAttributeValues"
                  ];
                  if (hide.includes(key)) return null;

                  // STATUS
                  if (key === "activated") {
                    return (
                      <tr key={key}>
                        <td>activated</td>
                        <td style={{
                          color: value ? "green" : "red",
                          fontWeight: "bold"
                        }}>
                          {value ? "Active" : "Inactive"}
                        </td>
                      </tr>
                    );
                  }

                  // REPORTING
                  if (key === "ownedBy") {
                    return (
                      <tr key={key}>
                        <td>reportingTo</td>
                        <td>{value?.map(v => v.login).join(", ")}</td>
                      </tr>
                    );
                  }

                  // ROLES
                  if (key === "authorities") {
                    return (
                      <tr key={key}>
                        <td>Roles</td>
                        <td>{value?.join(", ")}</td>
                      </tr>
                    );
                  }

                  // GEOFENCE
                  if (key === "geofenceNames") {
                    return (
                      <tr key={key}>
                        <td>Geofences</td>
                        <td>{value?.join(", ")}</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{value?.toString()}</td>
                    </tr>
                  );
                })}

              </tbody>
            </table>

            <button onClick={() => setSelectedUser(null)} style={styles.closeBtn}>
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
  page: { padding: "20px", maxWidth: "1200px", margin: "auto" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  search: { padding: "8px", width: "250px" },
  downloadBtn: { background: "#3b82f6", color: "white", padding: "8px", border: "none", borderRadius: "6px" },
  table: { width: "100%", borderCollapse: "collapse" },
  row: { borderBottom: "1px solid #ddd", cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" },
  modal: { background: "white", padding: "20px", width: "600px", borderRadius: "10px" },
  detailTable: { width: "100%" },
  closeBtn: { background: "#ef4444", color: "white", padding: "8px", border: "none", borderRadius: "6px" }
};

export default UsersTable;