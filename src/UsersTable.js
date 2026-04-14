import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedReportingTo, setSelectedReportingTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [blocks, setBlocks] = useState([]);
  const [selectedBlocks, setSelectedBlocks] = useState([]);

  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);

  const [reportingList, setReportingList] = useState([]);

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // USERS
  useEffect(() => {
    setLoading(true);

    axios.get("https://user-extract.onrender.com/api/users-summary")
      .then(res => {
        setUsers(res.data);

        const roleSet = new Set();
        const reportingSet = new Set();

        res.data.forEach(u => {
          u.roles?.forEach(r => roleSet.add(r));
          if (u.reportingTo) reportingSet.add(u.reportingTo);
        });

        setRoles([...roleSet]);
        setReportingList([...reportingSet]);
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

    axios.get(`https://user-extract.onrender.com/api/blocks/${selectedDistrict}`)
      .then(res => setBlocks(res.data));
  }, [selectedDistrict]);

  // FILTER
  const filteredUsers = users.filter(user => {

    const matchSearch =
      user.login?.toLowerCase().includes(search.toLowerCase());

    const matchReporting =
      !selectedReportingTo || user.reportingTo === selectedReportingTo;

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

    return matchSearch && matchReporting && matchRoles && matchBlocks;
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

      <h2>User Dashboard</h2>

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

        {/* REPORTING */}
        <select
          value={selectedReportingTo}
          onChange={(e) => setSelectedReportingTo(e.target.value)}
          style={styles.dropdown}
        >
          <option value="">All Reporting</option>
          {reportingList.map(r => (
            <option key={r}>{r}</option>
          ))}
        </select>

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
            <button style={styles.dropdown} onClick={() => setShowRoleDropdown(!showRoleDropdown)}>
              Select Roles
            </button>

            {showRoleDropdown && (
              <div style={styles.dropdownMenu}>
                {roles.map(r => (
                  <div key={r}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={() =>
                        setSelectedRoles(prev =>
                          prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
                        )
                      }
                    /> {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BLOCKS */}
        {selectedDistrict && (
          <div style={styles.dropdownWrapper}>
            <button style={styles.dropdown} onClick={() => setShowBlockDropdown(!showBlockDropdown)}>
              Select Blocks
            </button>

            {showBlockDropdown && (
              <div style={styles.dropdownMenu}>

                <div style={styles.selectAll}
                  onClick={() => setSelectedBlocks(blocks.map(b => b.id))}>
                  Select All
                </div>

                {blocks.map(b => (
                  <div key={b.id}>
                    <input
                      type="checkbox"
                      checked={selectedBlocks.includes(b.id)}
                      onChange={() =>
                        setSelectedBlocks(prev =>
                          prev.includes(b.id)
                            ? prev.filter(id => id !== b.id)
                            : [...prev, b.id]
                        )
                      }
                    /> {b.name}
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
          {currentUsers.map((u, i) => (
            <tr key={i} style={styles.row} onClick={() => handleUserClick(u)}>

              <td>{u.login}</td>
              <td>{u.name}</td>
              <td>{u.phone}</td>

              <td style={{ color: u.activated ? "green" : "red" }}>
                {u.activated ? "Active" : "Inactive"}
              </td>

              <td>{u.roles?.map((r,i)=><div key={i}>{r}</div>)}</td>

              <td>{u.version}</td>
              <td>{u.reportingTo}</td>

              <td>
                {u.geofenceNames?.length > 2 ? (
                  <details>
                    <summary>{u.geofenceNames.slice(0,2).join(", ")}</summary>
                    {u.geofenceNames.map((g,i)=><div key={i}>{g}</div>)}
                  </details>
                ) : u.geofenceNames?.map((g,i)=><div key={i}>{g}</div>)}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div style={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(p-1,1))}>Prev</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))}>Next</button>
      </div>

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h3>User Details</h3>

            <table style={styles.detailTable}>
              <tbody>
                <tr><td>Login</td><td>{selectedUser.login}</td></tr>
                <tr><td>Name</td><td>{selectedUser.firstName} {selectedUser.lastName}</td></tr>
                <tr><td>Phone</td><td>{selectedUser.phone}</td></tr>
                <tr><td>Status</td><td>{selectedUser.activated ? "Active" : "Inactive"}</td></tr>

                <tr><td>Roles</td>
                  <td>{selectedUser.authorities?.map((r,i)=><div key={i}>{r}</div>)}</td>
                </tr>

                <tr><td>Version</td><td>{selectedUser.applicationVersion}</td></tr>

                <tr><td>Geofences</td>
                  <td>{selectedUser.geofenceNames?.map((g,i)=><div key={i}>{g}</div>)}</td>
                </tr>
              </tbody>
            </table>

            <button style={styles.closeBtn} onClick={()=>setSelectedUser(null)}>
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page:{padding:"20px"},
  topBar:{display:"flex",gap:"10px",flexWrap:"wrap"},
  input:{padding:"8px"},
  dropdown:{padding:"8px"},
  dropdownWrapper:{position:"relative"},
  dropdownMenu:{position:"absolute",top:"40px",background:"white",border:"1px solid #ccc",padding:"10px"},
  selectAll:{fontWeight:"bold",color:"blue",cursor:"pointer"},
  downloadBtn:{background:"#2563eb",color:"white",padding:"8px"},
  table:{width:"100%",marginTop:"10px"},
  row:{cursor:"pointer"},
  pagination:{display:"flex",justifyContent:"center",gap:"10px"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",justifyContent:"center",alignItems:"center"},
  modal:{background:"white",padding:"20px",width:"50%"},
  detailTable:{width:"100%"},
  closeBtn:{background:"red",color:"white",padding:"8px"},
  loader:{textAlign:"center"}
};

export default UsersTable;