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

  // RESET PAGE
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedReportingTo, selectedRoles, selectedBlocks]);

  // FILTER
  const filteredUsers = users.filter(user =>
    user.login?.toLowerCase().includes(search.toLowerCase()) &&
    (!selectedReportingTo || user.reportingTo === selectedReportingTo) &&
    (selectedRoles.length === 0 || selectedRoles.some(r => user.roles?.includes(r))) &&
    (selectedBlocks.length === 0 ||
      selectedBlocks.some(id => {
        const block = blocks.find(b => b.id === id);
        return block && user.geofenceNames?.includes(block.name);
      }))
  );

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

      {loading && <div>Loading...</div>}

      {/* FILTERS */}
      <div style={styles.filters}>

        <input
          placeholder="Search"
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
        {selectedDistrict && (
          <div>
            <button onClick={()=>setShowRoleDropdown(!showRoleDropdown)}>Roles</button>

            {showRoleDropdown && (
              <div style={styles.dropdown}>
                {roles.map(r=>(
                  <label key={r}>
                    <input type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={() =>
                        setSelectedRoles(prev =>
                          prev.includes(r) ? prev.filter(x=>x!==r) : [...prev,r]
                        )
                      }
                    />
                    {r}
                  </label>
                ))}
                <button onClick={()=>setShowRoleDropdown(false)}>Done</button>
              </div>
            )}
          </div>
        )}

        {/* BLOCKS */}
        {selectedDistrict && (
          <div>
            <button onClick={()=>setShowBlockDropdown(!showBlockDropdown)}>Blocks</button>

            {showBlockDropdown && (
              <div style={styles.dropdown}>
                <div onClick={()=>setSelectedBlocks(blocks.map(b=>b.id))}>
                  Select All
                </div>

                {blocks.map(b=>(
                  <label key={b.id}>
                    <input type="checkbox"
                      checked={selectedBlocks.includes(b.id)}
                      onChange={() =>
                        setSelectedBlocks(prev =>
                          prev.includes(b.id)
                            ? prev.filter(id=>id!==b.id)
                            : [...prev,b.id]
                        )
                      }
                    />
                    {b.name}
                  </label>
                ))}

                <button onClick={()=>setShowBlockDropdown(false)}>Done</button>
              </div>
            )}
          </div>
        )}

        <button onClick={downloadAll}>
          {downloading ? "Downloading..." : "Download"}
        </button>

      </div>

      {/* TABLE */}
      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Login</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Roles</th>
            <th>Version</th>
            <th>Reporting</th>
            <th>Geofences</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((u,i)=>(
            <tr key={i} onClick={()=>handleUserClick(u)}>

              <td>{u.login}</td>
              <td>{u.name}</td>
              <td>{u.phone}</td>

              <td style={{color:u.activated?"green":"red"}}>
                {u.activated?"Active":"Inactive"}
              </td>

              <td>{u.roles?.map((r,i)=><div key={i}>{r}</div>)}</td>

              <td>{u.version}</td>
              <td>{u.reportingTo}</td>

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
        <button onClick={()=>setCurrentPage(p=>Math.max(p-1,1))}>Prev</button>
        <span>{currentPage}/{totalPages}</span>
        <button onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))}>Next</button>
      </div>

      {/* MODAL */}
      {selectedUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>User Details</h3>

            <p><b>Login:</b> {selectedUser.login}</p>
            <p><b>Name:</b> {selectedUser.firstName} {selectedUser.lastName}</p>
            <p><b>Phone:</b> {selectedUser.phone}</p>

            <button onClick={()=>setSelectedUser(null)}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page:{padding:"20px"},
  filters:{display:"flex",gap:"10px",flexWrap:"wrap"},
  dropdown:{border:"1px solid #ccc",padding:"10px"},
  pagination:{marginTop:"10px",textAlign:"center"},
  modalOverlay:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)"},
  modal:{background:"white",padding:"20px",margin:"100px auto",width:"50%"}
};

export default UsersTable;