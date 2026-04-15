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

        const rolesArr = [...roleSet];
        setRoles(rolesArr);
        setSelectedRoles(rolesArr); // ✅ default select all

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
    if (!selectedDistrict) {
      setBlocks([]);
      setSelectedBlocks([]);
      return;
    }

    axios.get(`https://user-extract.onrender.com/api/blocks/${selectedDistrict}`)
      .then(res => {
        setBlocks(res.data);
        setSelectedBlocks(res.data.map(b => b.id)); // ✅ default select all
      });
  }, [selectedDistrict]);

  // RESET PAGE
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedReportingTo, selectedRoles, selectedBlocks]);

  // FILTER
  const filteredUsers = users.filter(user => {

    const matchSearch =
      user.login?.toLowerCase().includes(search.toLowerCase());

    const matchReporting =
      !selectedReportingTo || user.reportingTo === selectedReportingTo;

    const matchRoles =
      selectedRoles.length === 0 ||
      selectedRoles.some(r => user.roles?.includes(r));

    const matchBlocks =
      selectedBlocks.length === 0 ||
      selectedBlocks.some(id => {
        const block = blocks.find(b => b.id === id);
        return block && user.geofenceNames?.includes(block.name);
      });

    const matchDistrict =
      !selectedDistrict ||
      blocks.some(b =>
        user.geofenceNames?.includes(b.name)
      );

    return matchSearch && matchReporting && matchRoles && matchBlocks && matchDistrict;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  // USER CLICK
  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data));
  };

  // DOWNLOAD
  const downloadAll = () => {
    setDownloading(true);

    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "users.xlsx");

    setDownloading(false);
  };

  return (
    <div style={styles.page}>

      <h2>User Dashboard</h2>

      {loading && (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <div>Loading users...</div>
        </div>
      )}

      {/* FILTERS */}
      <div style={styles.filters}>

        <input
          placeholder="Search"
          style={styles.input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select onChange={(e)=>setSelectedReportingTo(e.target.value)}>
          <option value="">All Reporting</option>
          {reportingList.map(r=><option key={r}>{r}</option>)}
        </select>

        <select onChange={(e)=>setSelectedDistrict(e.target.value)}>
          <option value="">District</option>
          {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* ROLES */}
        <div style={styles.dropdownWrapper}>
          <button style={styles.dropdownBtn} onClick={()=>setShowRoleDropdown(!showRoleDropdown)}>
            Roles ({selectedRoles.length})
          </button>

          {showRoleDropdown && (
            <div style={styles.dropdownMenu}>

              <div style={styles.dropdownTitle}>Select Roles</div>

              <div style={styles.selectAll}
                onClick={() => {
                  if (selectedRoles.length === roles.length) {
                    setSelectedRoles([]);
                  } else {
                    setSelectedRoles(roles);
                  }
                }}>
                {selectedRoles.length === roles.length ? "Unselect All" : "Select All"}
              </div>

              <div style={styles.dropdownList}>
                {roles.map(r => (
                  <label key={r} style={styles.dropdownItem}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={() =>
                        setSelectedRoles(prev =>
                          prev.includes(r)
                            ? prev.filter(x => x !== r)
                            : [...prev, r]
                        )
                      }
                    />
                    {r}
                  </label>
                ))}
              </div>

              <button style={styles.closeDropdownBtn} onClick={()=>setShowRoleDropdown(false)}>Close</button>

            </div>
          )}
        </div>

        {/* BLOCKS */}
        <div style={styles.dropdownWrapper}>
          <button style={styles.dropdownBtn} onClick={()=>setShowBlockDropdown(!showBlockDropdown)}>
            Blocks ({selectedBlocks.length})
          </button>

          {showBlockDropdown && (
            <div style={styles.dropdownMenu}>

              <div style={styles.dropdownTitle}>Select Blocks</div>

              <div style={styles.selectAll}
                onClick={() => {
                  if (selectedBlocks.length === blocks.length) {
                    setSelectedBlocks([]);
                  } else {
                    setSelectedBlocks(blocks.map(b => b.id));
                  }
                }}>
                {selectedBlocks.length === blocks.length ? "Unselect All" : "Select All"}
              </div>

              <div style={styles.dropdownList}>
                {blocks.map(b => (
                  <label key={b.id} style={styles.dropdownItem}>
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
                    />
                    {b.name}
                  </label>
                ))}
              </div>

              <button style={styles.closeDropdownBtn} onClick={()=>setShowBlockDropdown(false)}>Close</button>

            </div>
          )}
        </div>

        <button style={styles.downloadBtn} onClick={downloadAll}>
          {downloading ? "Downloading..." : "Download"}
        </button>

      </div>

      {/* TABLE + MODAL SAME AS YOUR CODE (UNCHANGED) */}

    </div>
  );
}

const styles = {
  page:{padding:"20px"},
  filters:{display:"flex",gap:"10px",flexWrap:"wrap"},
  input:{padding:"8px"},
  dropdownWrapper:{position:"relative"},
  dropdownBtn:{padding:"8px",border:"1px solid #ccc",cursor:"pointer"},
  dropdownMenu:{position:"absolute",top:"40px",background:"white",border:"1px solid #ccc",padding:"10px"},
  dropdownList:{maxHeight:"200px",overflowY:"auto"},
  dropdownItem:{display:"flex",gap:"5px"},
  selectAll:{fontWeight:"bold",color:"blue",cursor:"pointer"},
  closeDropdownBtn:{marginTop:"5px"},
  downloadBtn:{background:"#2563eb",color:"white",padding:"8px"},
  loaderContainer:{display:"flex",justifyContent:"center",gap:"10px"},
  spinner:{width:"18px",height:"18px",border:"3px solid #ccc",borderTop:"3px solid blue",borderRadius:"50%"}
};

export default UsersTable;