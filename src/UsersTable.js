import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [blocks, setBlocks] = useState([]);
  const [selectedBlocks, setSelectedBlocks] = useState([]);

  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);

  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const tableRef = useRef(null);

  // USERS
  useEffect(() => {
    setLoading(true);

    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => {
        setUsers(res.data);

        const roleSet = new Set();
        res.data.forEach(u => {
          u.roles?.forEach(r => roleSet.add(r));
        });
        setRoles([...roleSet]);
      })
      .finally(() => setLoading(false));
  }, []);

  // DISTRICTS
  useEffect(() => {
    axios.get("https://user-extract.onrender.com/api/districts")
      .then(res => setDistricts(res.data));
  }, []);

  // BLOCKS
  useEffect(() => {
    if (!selectedDistrict) return;

    setBlocksLoading(true);
    axios.get(`https://user-extract.onrender.com/api/blocks/${selectedDistrict}`)
      .then(res => setBlocks(res.data))
      .finally(() => setBlocksLoading(false));
  }, [selectedDistrict]);

  // FILTER
  const filteredUsers = users.filter(user => {

    const matchSearch =
      user.login?.toLowerCase().includes(search.toLowerCase());

    const matchDistrict =
      !selectedDistrict ||
      blocks.some(b => user.geofenceNames?.includes(b.name));

    const matchRoles =
      selectedRoles.length === 0 ||
      selectedRoles.some(role => user.roles?.includes(role));

    const matchBlocks =
      selectedBlocks.length === 0 ||
      selectedBlocks.some(id =>
        user.geofenceNames?.includes(
          blocks.find(b => b.id === id)?.name
        )
      );

    return matchSearch && matchDistrict && matchRoles && matchBlocks;
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // 🔥 USER CLICK FIX (SCROLL TO TOP)
  const handleUserClick = (user) => {
    setGlobalLoading(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data))
      .finally(() => setGlobalLoading(false));
  };

  // DOWNLOAD
  const downloadAll = () => {
    setDownloading(true);

    const data = users.map(u => ({
      Login: u.login,
      Name: u.name,
      Phone: u.phone,
      Status: u.activated ? "Active" : "Inactive",
      ReportingTo: u.reportingTo,
      Roles: u.roles?.join(", "),
      Version: u.version,
      Geofences: u.geofenceNames?.join(", ")
    }));

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

      {(loading || globalLoading) && (
        <div style={styles.loader}>⏳ Loading...</div>
      )}

      {/* FILTER BAR */}
      <div style={styles.topBar}>

        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        {/* DISTRICT */}
        <select
          value={selectedDistrict}
          onChange={(e) => {
            setSelectedDistrict(e.target.value);
            setSelectedBlocks([]);
            setSelectedRoles([]);
          }}
          style={styles.dropdown}
        >
          <option value="">All Districts</option>
          {districts.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* ROLES */}
        {selectedDistrict && (
          <div style={styles.dropdownWrapper}>
            <button onClick={() => setShowRoleDropdown(!showRoleDropdown)} style={styles.dropdown}>
              {selectedRoles.length > 0
                ? `${selectedRoles.length} Roles Selected`
                : "Select Roles"}
            </button>

            {showRoleDropdown && (
              <div style={styles.dropdownMenu}>
                {roles.map(r => (
                  <div key={r} style={styles.dropdownItem}
                    onClick={() => {
                      if (selectedRoles.includes(r)) {
                        setSelectedRoles(selectedRoles.filter(x => x !== r));
                      } else {
                        setSelectedRoles([...selectedRoles, r]);
                      }
                    }}>
                    <input type="checkbox" checked={selectedRoles.includes(r)} readOnly />
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BLOCKS */}
        {selectedDistrict && (
          <div style={styles.dropdownWrapper}>
            <button onClick={() => setShowBlockDropdown(!showBlockDropdown)} style={styles.dropdown}>
              {blocksLoading ? "Loading..." :
                selectedBlocks.length > 0
                  ? `${selectedBlocks.length} Blocks Selected`
                  : "Select Blocks"}
            </button>

            {showBlockDropdown && (
              <div style={styles.dropdownMenu}>
                {blocks.map(b => (
                  <div key={b.id} style={styles.dropdownItem}
                    onClick={() => {
                      if (selectedBlocks.includes(b.id)) {
                        setSelectedBlocks(selectedBlocks.filter(id => id !== b.id));
                      } else {
                        setSelectedBlocks([...selectedBlocks, b.id]);
                      }
                    }}>
                    <input type="checkbox" checked={selectedBlocks.includes(b.id)} readOnly />
                    {b.name}
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
          {currentUsers.map((user, i) => (
            <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>

              <td>{user.login}</td>
              <td>{user.name}</td>
              <td>{user.phone}</td>

              <td style={{ color: user.activated ? "green" : "red" }}>
                {user.activated ? "Active" : "Inactive"}
              </td>

              <td>{user.roles?.map((r, i) => <div key={i}>{r}</div>)}</td>
              <td>{user.version}</td>
              <td>{user.reportingTo}</td>

              <td>
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

      {/* PAGINATION */}
      <div style={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Prev</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>Next</button>
      </div>

      {/* 🔥 CLEAN MODAL FIXED */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h2>User Details</h2>

            <table style={styles.detailTable}>
              <tbody>

                <tr><td style={styles.key}>Login</td><td>{selectedUser.login}</td></tr>
                <tr><td style={styles.key}>Name</td><td>{selectedUser.firstName} {selectedUser.lastName}</td></tr>
                <tr><td style={styles.key}>Phone</td><td>{selectedUser.phone}</td></tr>

                <tr>
                  <td style={styles.key}>Status</td>
                  <td style={{ color: selectedUser.activated ? "green" : "red" }}>
                    {selectedUser.activated ? "Active" : "Inactive"}
                  </td>
                </tr>

                <tr>
                  <td style={styles.key}>Reporting To</td>
                  <td>{selectedUser.ownedBy?.map(o => o.login).join(", ")}</td>
                </tr>

                <tr>
                  <td style={styles.key}>Roles</td>
                  <td>{selectedUser.authorities?.map((r, i) => <div key={i}>{r}</div>)}</td>
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

            <button onClick={() => setSelectedUser(null)} style={styles.closeBtn}>
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page: { padding: "20px" },
  topBar: { display: "flex", gap: "10px", flexWrap: "wrap" },
  input: { padding: "8px" },
  dropdown: { padding: "8px" },
  dropdownWrapper: { position: "relative" },
  dropdownMenu: { position: "absolute", top: "40px", background: "white", border: "1px solid #ccc" },
  dropdownItem: { padding: "6px", cursor: "pointer" },
  downloadBtn: { background: "#2563eb", color: "white", padding: "8px" },
  table: { width: "100%" },
  row: { cursor: "pointer" },
  pagination: { display: "flex", justifyContent: "center", gap: "10px" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" },
  modal: { background: "white", padding: "20px", margin: "50px auto", width: "60%" },
  detailTable: { width: "100%" },
  key: { fontWeight: "bold" },
  closeBtn: { background: "#dc2626", color: "white", padding: "8px" },
  loader: { textAlign: "center" }
};

export default UsersTable;