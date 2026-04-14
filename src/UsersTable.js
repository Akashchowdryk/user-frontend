import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const [blocksLoading, setBlocksLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [blocks, setBlocks] = useState([]);
  const [selectedBlocks, setSelectedBlocks] = useState([]);

  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  const tableRef = useRef(null);

  // USERS
  useEffect(() => {
    setLoading(true);
    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => setUsers(res.data))
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

  // SCROLL
  useEffect(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentPage]);

  // FILTER
  const filteredUsers = users.filter(user => {

    const matchSearch =
      user.login?.toLowerCase().includes(search.toLowerCase());

    const matchDistrict =
      !selectedDistrict ||
      blocks.some(b => user.geofenceIds?.includes(b.id));

    const matchBlocks =
      selectedBlocks.length === 0 ||
      selectedBlocks.some(id =>
        user.geofenceIds?.includes(id)
      );

    return matchSearch && matchDistrict && matchBlocks;
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLastUser - usersPerPage, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // USER CLICK
  const handleUserClick = (user) => {
    setGlobalLoading(true);

    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data))
      .finally(() => setGlobalLoading(false));
  };

  // DOWNLOAD
  const downloadAll = async () => {
    setDownloading(true);
    setGlobalLoading(true);

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
    setGlobalLoading(false);
  };

  return (
    <div style={styles.page}>

      <h1>User Dashboard</h1>

      {(loading || globalLoading) && (
        <div style={styles.loader}>Loading...</div>
      )}

      <div style={styles.topBar}>

        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.input}
        />

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
              style={styles.dropdown}
            >
              {blocksLoading
                ? "Loading Blocks..."
                : selectedBlocks.length > 0
                  ? `${selectedBlocks.length} Blocks Selected`
                  : "Select Blocks"}
            </button>

            {showBlockDropdown && (
              <div style={styles.dropdownMenu}>

                {blocksLoading ? (
                  <div style={styles.loader}>Loading...</div>
                ) : (
                  blocks.map(b => (
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
                  ))
                )}

              </div>
            )}
          </div>
        )}

        <button onClick={downloadAll} style={styles.downloadBtn}>
          {downloading ? "Downloading..." : "Download All"}
        </button>
      </div>

      <div ref={tableRef}>
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

                  <td style={{ color: user.activated ? "green" : "red" }}>
                    {user.activated ? "Active" : "Inactive"}
                  </td>

                  <td>{user.reportingTo}</td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {user.geofenceNames?.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>
            Prev
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button style={styles.pageBtn} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>
            Next
          </button>
        </div>
      )}

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2>User Details</h2>
            <pre>{JSON.stringify(selectedUser, null, 2)}</pre>
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
  page: { padding: "20px", maxWidth: "1200px", margin: "auto" },
  topBar: { display: "flex", gap: "10px", marginBottom: "10px" },
  input: { padding: "8px" },
  dropdown: { padding: "8px" },
  dropdownWrapper: { position: "relative" },
  dropdownMenu: { position: "absolute", top: "40px", background: "white", border: "1px solid #ccc" },
  dropdownItem: { padding: "6px", display: "flex", gap: "8px", cursor: "pointer" },
  downloadBtn: { background: "#2563eb", color: "white", padding: "8px", borderRadius: "6px" },
  table: { width: "100%" },
  row: { cursor: "pointer" },
  pagination: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px" },
  pageBtn: { padding: "8px" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" },
  modal: { background: "white", padding: "20px", margin: "50px auto", width: "60%" },
  closeBtn: { background: "#dc2626", color: "white", padding: "8px" },
  loader: { textAlign: "center", fontWeight: "bold" }
};

export default UsersTable;