import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [blocks, setBlocks] = useState([]);
  const [selectedBlocks, setSelectedBlocks] = useState([]);

  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  // 🚀 LOAD USERS
  useEffect(() => {
    setLoading(true);
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // 🚀 DISTRICTS
  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/districts")
      .then(res => setDistricts(res.data));
  }, []);

  // 🚀 BLOCKS
  useEffect(() => {
    if (!selectedDistrict) return;

    axios.get(`https://user-extract.onrender.com/api/blocks/${selectedDistrict}`)
      .then(res => setBlocks(res.data));
  }, [selectedDistrict]);

  // 🔍 FILTER
  const filteredUsers = users.filter(user => {

    const matchSearch =
      user.login?.toLowerCase().includes(search.toLowerCase());

    const matchDistrict =
      !selectedDistrict ||
      blocks.some(b =>
        user.geofenceIds?.includes(b.id)
      );

    const matchBlocks =
      selectedBlocks.length === 0 ||
      selectedBlocks.some(id =>
        user.geofenceIds?.includes(id)
      );

    return matchSearch && matchDistrict && matchBlocks;
  });

  // 📄 PAGINATION
  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 USER CLICK
  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data))
      .catch(err => console.error(err));
  };

  // ⬇ DOWNLOAD
  const downloadAll = async () => {
    setDownloading(true);

    const data = await Promise.all(
      users.map(async u => {
        const res = await axios.get(`https://user-extract.onrender.com/api/user/${u.login}`);
        const d = res.data;

        return {
          Login: d.login,
          Name: `${d.firstName || ""} ${d.lastName || ""}`,
          Phone: d.phone,
          Status: d.activated ? "Active" : "Inactive",
          ReportingTo: d.ownedBy?.map(x => x.login).join(", "),
          Roles: d.authorities?.join(", "),
          Geofences: d.geofenceNames?.join(", ")
        };
      })
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users.xlsx");

    setDownloading(false);
  };

  return (
    <div style={styles.page}>

      <h1>User Dashboard</h1>

      {loading && <div style={styles.loader}>Loading users...</div>}

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

        {/* DISTRICT */}
        <select
          value={selectedDistrict}
          onChange={(e) => {
            setSelectedDistrict(e.target.value);
            setSelectedBlocks([]);
          }}
          style={styles.dropdown}
        >
          <option value="">All Districts</option>
          {districts.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* BLOCK DROPDOWN */}
        {selectedDistrict && (
          <div style={styles.dropdownWrapper}>

            <button
              onClick={() => setShowBlockDropdown(!showBlockDropdown)}
              style={styles.dropdownBtn}
            >
              {selectedBlocks.length > 0
                ? `${selectedBlocks.length} Blocks Selected`
                : "Select Blocks"}
            </button>

            {showBlockDropdown && (
              <div style={styles.dropdownMenu}>
                {blocks.map(b => (
                  <div
                    key={b.id}
                    style={styles.dropdownItem}
                    onClick={() => {
                      if (selectedBlocks.includes(b.id)) {
                        setSelectedBlocks(selectedBlocks.filter(id => id !== b.id));
                      } else {
                        setSelectedBlocks([...selectedBlocks, b.id]);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBlocks.includes(b.id)}
                      readOnly
                    />
                    <span>{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={downloadAll} style={styles.downloadBtn}>
          {downloading ? "Downloading..." : "Download All"}
        </button>
      </div>

      {/* TABLE */}
      {!loading && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Login</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Reporting To</th>
              <th>Geofences</th>
            </tr>
          </thead>

          <tbody>
            {currentUsers.map((user, i) => (
              <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>
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

                <td onClick={(e) => e.stopPropagation()}>
                  {user.geofenceNames?.length > 2 ? (
                    <details>
                      <summary>{user.geofenceNames.slice(0, 2).join(", ")}</summary>
                      {user.geofenceNames.map((g, i) => (
                        <div key={i}>{g}</div>
                      ))}
                    </details>
                  ) : (
                    user.geofenceNames?.join(", ")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* PAGINATION */}
      {!loading && (
        <div style={styles.pagination}>
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Prev</button>
          <span>{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>Next</button>
        </div>
      )}

      {/* 🔥 MODAL CLEAN UI */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2>User Details</h2>

            <div style={styles.scrollBox}>
              <table style={styles.detailTable}>
                <tbody>

                  {Object.entries(selectedUser).map(([key, value]) => {

                    const hidden = [
                      "geofences","groups","vendors",
                      "trakeyeType","trakeyeTypeAttribute",
                      "trakeyeTypeAttributeValues","vendor"
                    ];

                    if (hidden.includes(key)) return null;

                    if (key === "activated") {
                      return (
                        <tr key={key}>
                          <td style={styles.key}>Status</td>
                          <td style={{ color: value ? "green" : "red" }}>
                            {value ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      );
                    }

                    if (key === "authorities") {
                      return (
                        <tr key={key}>
                          <td style={styles.key}>Roles</td>
                          <td>
                            {value?.map((r, i) => <div key={i}>{r}</div>)}
                          </td>
                        </tr>
                      );
                    }

                    if (key === "ownedBy") {
                      return (
                        <tr key={key}>
                          <td style={styles.key}>Reporting To</td>
                          <td>{value?.map(v => v.login).join(", ")}</td>
                        </tr>
                      );
                    }

                    if (key === "geofenceNames") {
                      return (
                        <tr key={key}>
                          <td style={styles.key}>Geofences</td>
                          <td>
                            {value?.length > 2 ? (
                              <details>
                                <summary>{value.slice(0, 2).join(", ")}</summary>
                                {value.map((g, i) => <div key={i}>{g}</div>)}
                              </details>
                            ) : value?.join(", ")}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={key}>
                        <td style={styles.key}>{key}</td>
                        <td>{Array.isArray(value) ? value.join(", ") : value?.toString()}</td>
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>

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
  topBar: { display: "flex", gap: "10px", marginBottom: "10px" },
  search: { padding: "8px" },
  dropdown: { padding: "8px" },
  dropdownWrapper: { position: "relative" },
  dropdownBtn: { padding: "8px", cursor: "pointer" },
  dropdownMenu: {
    position: "absolute",
    top: "40px",
    width: "200px",
    maxHeight: "200px",
    overflowY: "auto",
    background: "white",
    border: "1px solid #ccc"
  },
  dropdownItem: { padding: "6px", display: "flex", gap: "8px", cursor: "pointer" },
  downloadBtn: { padding: "8px" },
  table: { width: "100%" },
  row: { cursor: "pointer" },
  pagination: { marginTop: "10px" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" },
  modal: { background: "white", padding: "20px", width: "600px", margin: "50px auto", borderRadius: "10px" },
  scrollBox: { maxHeight: "400px", overflowY: "auto" },
  detailTable: { width: "100%" },
  key: { fontWeight: "bold", width: "40%" },
  closeBtn: { marginTop: "10px" },
  loader: { textAlign: "center" }
};

export default UsersTable;