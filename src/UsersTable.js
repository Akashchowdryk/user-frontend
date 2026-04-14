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

  // 🔥 DISABLE BODY SCROLL WHEN MODAL OPEN
  useEffect(() => {
    document.body.style.overflow = selectedUser ? "hidden" : "auto";
  }, [selectedUser]);

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
  const filteredUsers = users.filter(user =>
    user.login?.toLowerCase().includes(search.toLowerCase()) &&
    (!selectedReportingTo || user.reportingTo === selectedReportingTo) &&
    (selectedRoles.length === 0 || selectedRoles.some(r => user.roles?.includes(r))) &&
    (selectedBlocks.length === 0 ||
      selectedBlocks.some(id =>
        user.geofenceNames?.includes(blocks.find(b => b.id === id)?.name)
      ))
  );

  const currentUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // USER CLICK
  const handleUserClick = (user) => {
    setGlobalLoading(true);

    window.scrollTo({ top: 0, behavior: "smooth" });

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

      {(loading || globalLoading) && <div style={styles.loader}>⏳ Loading...</div>}

      {/* FILTERS */}
      <div style={styles.topBar}>

        <input placeholder="Search..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={styles.input} />

        <select value={selectedReportingTo}
          onChange={(e) => setSelectedReportingTo(e.target.value)}
          style={styles.dropdown}>
          <option value="">All Reporting</option>
          {reportingList.map(r => <option key={r}>{r}</option>)}
        </select>

        <select value={selectedDistrict}
          onChange={(e) => {
            setSelectedDistrict(e.target.value);
            setSelectedBlocks([]);
            setSelectedRoles([]);
          }}
          style={styles.dropdown}>
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* ROLES */}
        {selectedDistrict && (
          <div style={styles.dropdownWrapper}>
            <button style={styles.dropdown} onClick={() => setShowRoleDropdown(!showRoleDropdown)}>
              Roles ({selectedRoles.length})
            </button>

            {showRoleDropdown && (
              <div style={styles.dropdownMenu}>
                <div style={styles.dropdownTitle}>Roles</div>

                {roles.map(r => (
                  <label key={r} style={styles.dropdownItem}>
                    <input type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={() =>
                        setSelectedRoles(prev =>
                          prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
                        )
                      }
                    />
                    {r}
                  </label>
                ))}

                <button style={styles.doneBtn} onClick={() => setShowRoleDropdown(false)}>Done</button>
              </div>
            )}
          </div>
        )}

        {/* BLOCKS */}
        {selectedDistrict && (
          <div style={styles.dropdownWrapper}>
            <button style={styles.dropdown} onClick={() => setShowBlockDropdown(!showBlockDropdown)}>
              Blocks ({selectedBlocks.length})
            </button>

            {showBlockDropdown && (
              <div style={styles.dropdownMenu}>
                <div style={styles.dropdownTitle}>Blocks</div>

                <div style={styles.selectAll}
                  onClick={() => setSelectedBlocks(blocks.map(b => b.id))}>
                  Select All
                </div>

                {blocks.map(b => (
                  <label key={b.id} style={styles.dropdownItem}>
                    <input type="checkbox"
                      checked={selectedBlocks.includes(b.id)}
                      onChange={() =>
                        setSelectedBlocks(prev =>
                          prev.includes(b.id)
                            ? prev.filter(id => id !== b.id)
                            : [...prev, b.id]
                        )
                      }
                    />
                    {b.name}
                  </label>
                ))}

                <button style={styles.doneBtn} onClick={() => setShowBlockDropdown(false)}>Done</button>
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
        <tbody>
          {currentUsers.map((u,i)=>(
            <tr key={i} onClick={()=>handleUserClick(u)}>
              <td>{u.login}</td>
              <td>{u.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.overlay}>
          <div style={styles.modal}>

            <h3>User Details</h3>

            <div style={styles.modalContent}>
              {Object.entries(selectedUser).map(([k,v])=>(
                <div key={k}><b>{k}</b>: {JSON.stringify(v)}</div>
              ))}
            </div>

            <button style={styles.closeBtn} onClick={()=>setSelectedUser(null)}>Close</button>

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
  dropdownMenu:{
    position:"absolute",
    top:"40px",
    background:"white",
    border:"1px solid #ccc",
    padding:"10px",
    width:"200px",
    maxHeight:"250px",
    overflowY:"auto"
  },
  dropdownTitle:{fontWeight:"bold",marginBottom:"5px"},
  dropdownItem:{display:"flex",gap:"5px",marginBottom:"5px"},
  selectAll:{fontWeight:"bold",color:"blue",cursor:"pointer"},
  doneBtn:{marginTop:"10px",background:"green",color:"white"},
  downloadBtn:{background:"#2563eb",color:"white"},
  table:{width:"100%",marginTop:"10px"},
  overlay:{
    position:"fixed",
    inset:0,
    background:"rgba(0,0,0,0.6)",
    display:"flex",
    justifyContent:"center",
    alignItems:"center"
  },
  modal:{
    background:"white",
    width:"60%",
    maxHeight:"80vh",
    overflow:"hidden",
    display:"flex",
    flexDirection:"column"
  },
  modalContent:{
    overflowY:"auto",
    padding:"10px"
  },
  closeBtn:{background:"red",color:"white"},
  loader:{textAlign:"center"}
};

export default UsersTable;