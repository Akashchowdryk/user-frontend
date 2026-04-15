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
 {/* TABLE */}
      <table style={styles.table} border="1" width="100%">
        <thead>
          <tr style={styles.row}>
            <th style={styles.th}>Login</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Roles</th>
            <th style={styles.th}>Version</th>
            <th style={styles.th}>Reporting</th>
            <th style={styles.th}>Geofences</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((u,i)=>(
            <tr style={styles.row}key={i} onClick={()=>handleUserClick(u)}>

              <td style={styles.td}>{u.login}</td>
              <td style={styles.td}>{u.name}</td>
              <td style={styles.td}>{u.phone}</td>

              <td style={{color:u.activated?"green":"red"}}>
                {u.activated?"Active":"Inactive"}
              </td>

              <td style={styles.td}>{u.roles?.map((r,i)=><div key={i}>{r}</div>)}</td>

              <td style={styles.td}>{u.version}</td>
              <td style={styles.td}>{u.reportingTo}</td>

              <td onClick={(e)=>e.stopPropagation()}>
                {u.geofenceNames?.length>2 ? (
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
        <button style={styles.pageBtn} onClick={()=>setCurrentPage(p=>Math.max(p-1,1))}>Prev</button>
        <span>{currentPage}/{totalPages}</span>
        <button style={styles.pageBtn} onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))}>Next</button>
      </div>

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>User Details</h3>

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
                          <td>{value?.map((r, i) => <div key={i}>{r}</div>)}</td>
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
            <button style={styles.closeBtn} onClick={()=>setSelectedUser(null)}>Close</button>
          </div>
        </div>
      )}
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