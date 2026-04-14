import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);

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
          u.authorities?.forEach(r => roleSet.add(r));
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
      selectedBlocks.some(id => user.geofenceIds?.includes(id));

    const matchRoles =
      selectedRoles.length === 0 ||
      selectedRoles.some(role => user.authorities?.includes(role));

    return matchSearch && matchDistrict && matchBlocks && matchRoles;
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

        {/* BLOCK FILTER */}
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

        {/* ROLES FILTER */}
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

      </div>

      {/* TABLE */}
      <div ref={tableRef}>
        {!loading && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Login</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Roles</th>
                <th>Version</th>
              </tr>
            </thead>

            <tbody>
              {currentUsers.map((user, i) => (
                <tr key={i} style={styles.row} onClick={() => handleUserClick(user)}>
                  <td>{user.login}</td>
                  <td>{user.name}</td>
                  <td>{user.phone}</td>

                  <td>
                    {user.authorities?.map((r, i) => (
                      <div key={i}>{r}</div>
                    ))}
                  </td>

                  <td>{user.applicationVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      <div style={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Prev</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>Next</button>
      </div>

      {/* CLEAN MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2>User Details</h2>

            <table style={styles.detailTable}>
              <tbody>

                <tr>
                  <td style={styles.key}>Login</td>
                  <td>{selectedUser.login}</td>
                </tr>

                <tr>
                  <td style={styles.key}>Name</td>
                  <td>{selectedUser.firstName} {selectedUser.lastName}</td>
                </tr>

                <tr>
                  <td style={styles.key}>Phone</td>
                  <td>{selectedUser.phone}</td>
                </tr>

                <tr>
                  <td style={styles.key}>Roles</td>
                  <td>
                    {selectedUser.authorities?.map((r, i) => <div key={i}>{r}</div>)}
                  </td>
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
  topBar: { display: "flex", gap: "10px" },
  dropdownWrapper: { position: "relative" },
  dropdownMenu: { position: "absolute", top: "40px", background: "white", border: "1px solid #ccc" },
  dropdownItem: { padding: "6px", cursor: "pointer" },
  dropdown: { padding: "8px" },
  table: { width: "100%" },
  row: { cursor: "pointer" },
  pagination: { display: "flex", justifyContent: "center", gap: "10px" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" },
  modal: { background: "white", padding: "20px", margin: "50px auto", width: "50%" },
  detailTable: { width: "100%" },
  key: { fontWeight: "bold" },
  closeBtn: { background: "#dc2626", color: "white", padding: "8px" },
  loader: { textAlign: "center" }
};

export default UsersTable;