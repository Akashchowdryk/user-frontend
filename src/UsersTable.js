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
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [blockSearch, setBlockSearch] = useState("");
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [roleSearch, setRoleSearch] = useState("");

  const [reportingList, setReportingList] = useState([]);
  const [showReportingDropdown, setShowReportingDropdown] = useState(false);
  const [reportSearch, setReportSearch] = useState("");

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const [editUser, setEditUser] = useState(null);

const [rolesList, setRolesList] = useState([]);
const [reportingListEdit, setReportingListEdit] = useState([]);
const [loadingRoles, setLoadingRoles] = useState(false);
const [loadingReporting, setLoadingReporting] = useState(false);

const [selectedRolesEdit, setSelectedRolesEdit] = useState([]);
const [selectedReportingEdit, setSelectedReportingEdit] = useState(null);

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
        setSelectedRoles(rolesArr);

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

    setBlocksLoading(true);

    axios.get(`https://user-extract.onrender.com/api/blocks/${selectedDistrict}`)
      .then(res => {
        setBlocks(res.data);
        setSelectedBlocks(res.data.map(b => b.id));
      })
      .finally(() => setBlocksLoading(false));

  }, [selectedDistrict]);

  // RESET PAGE
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedReportingTo, selectedDistrict, selectedRoles, selectedBlocks]);

  // FILTER
  const filteredUsers = users.length === 0 ? [] : users.filter(user => {

 const searchText = search.toLowerCase();

const matchSearch =
  user.login?.toLowerCase().includes(searchText) ||

  (user.name &&
    user.name.toLowerCase().includes(searchText)) ||

  (user.phone &&
    user.phone.toString().toLowerCase().includes(searchText));
  const matchReporting =
    !selectedReportingTo || user.reportingTo === selectedReportingTo;

  const matchRoles =
    selectedRoles.length === 0 ||
    selectedRoles.some(r => user.roles?.includes(r));
    

  const matchBlocks =
    !selectedDistrict ||
    (selectedBlocks.length > 0 &&
      selectedBlocks.some(id => {
        const block = blocks.find(b => b.id === id);
        return block && user.geofenceNames?.includes(block.name);
      }));


  const matchDistrict =
    !selectedDistrict ||
    blocks.some(b => user.geofenceNames?.includes(b.name));

  return matchSearch && matchReporting && matchRoles && matchBlocks && matchDistrict;
});
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );
  const openEditModal = (user) => {

  setLoadingRoles(true);
  setLoadingReporting(true);

  axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
    .then(res => {

      const fullUser = res.data;

      setEditUser(fullUser);

      // ✅ Roles
      setSelectedRolesEdit(fullUser.authorities || []);

      // ✅ Geofences (IDs only)
      const geoIds = fullUser.geofences?.map(g =>
        typeof g === "object" ? g.id : g
      ) || [];
      setSelectedBlocks(geoIds);

      // ✅ Fetch Roles API (REAL)
      axios.get("https://user-extract.onrender.com/api/roles")
        .then(res => {
          setRolesList(res.data || []);
        })
        .finally(() => setLoadingRoles(false));

      // ✅ Fetch Reporting API (REAL)
      axios.get("https://user-extract.onrender.com/api/reporting-users")
        .then(res => {
          const list = res.data || [];
          setReportingListEdit(list);

          const reportingId = fullUser.ownedBy?.[0]?.id;
          const selected = list.find(x => x.id === reportingId);
          setSelectedReportingEdit(selected || null);
        })
        .finally(() => setLoadingReporting(false));

      // ✅ Fetch Geofences (BLOCKS)
      axios.get("https://user-extract.onrender.com/api/geofences")
        .then(res => {
          setBlocks(res.data || []);
        });

    })
    .catch(err => {
      console.error("Error loading user:", err);
      setLoadingRoles(false);
      setLoadingReporting(false);
    });
};
  


// ✅ FIX 2: handleUpdate (Correct payload + endpoint)
const handleUpdate = async () => {

  if (!editUser) {
    alert("No user selected ❌");
    return;
  }

  const payload = {
    id: editUser.id,
    login: editUser.login,
    firstName: editUser.firstName || "",
    lastName: editUser.lastName || "",
    email: editUser.email || "",
    phone: editUser.phone || "",
    gpsimei: editUser.gpsimei || "",
    activated: editUser.activated ?? true,

    // ✅ Roles
    authorities: selectedRolesEdit || [],

    // ✅ Geofences (IMPORTANT FIX)
    geofences: selectedBlocks.map(id => ({ id })),

    // ✅ Reporting
    ownedBy: selectedReportingEdit
      ? [{ id: selectedReportingEdit.id }]
      : [],

    langKey: editUser.langKey || "en"
  };

  console.log("FINAL PAYLOAD:", payload);

  try {
    await axios.put(
      "https://user-extract.onrender.com/api/edit-user",
      payload
    );

    alert("Updated Successfully ✅");

    setEditUser(null);

    // refresh list
    window.location.reload();

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
    alert("Update Failed ❌");
  }
};


  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data));
  };

  const downloadAll = () => {
  setDownloading(true);

  // ✅ Use FILTERED DATA (not raw users)
  const dataToExport = filteredUsers.map(u => ({
    Login: u.login,
    Name: u.name,
    Phone: u.phone,
    Status: u.activated ? "Active" : "Inactive",
    Roles: u.roles?.join(", "),                 // ✅ roles fixed
    Version: u.version,
    Reporting: u.reportingTo,
    Geofences: u.geofenceNames?.join(", ")      // ✅ geofences fixed
  }));

  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer]), "Filtered_Users.xlsx");

  setDownloading(false);
};

  return (
    <div style={styles.page}>

      <h2>User Dashboard</h2>

      {loading && (
        <div style={styles.loaderContainer}>
          <div className="spinner"></div>
          <span>Loading users...</span>
        </div>
      )}
      {blocksLoading && (
  <div style={styles.loaderContainer}>
    <div className="spinner"></div>
    <span>Loading blocks...</span>
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

       <div style={styles.dropdownWrapper}>

  <button
    style={styles.dropdownBtn}
    onClick={() => setShowReportingDropdown(!showReportingDropdown)}
  >
    {selectedReportingTo || "Reporting To"}
  </button>

  {showReportingDropdown && (
    <div style={styles.dropdownMenu}>

      {/* SEARCH INPUT */}
      <input
        type="text"
        placeholder="Search..."
        value={reportSearch}
        onChange={(e) => setReportSearch(e.target.value)}
        style={styles.input}
      />

      {/* OPTIONS */}
      <div style={styles.dropdownList}>

  {/* ✅ ALL REPORTING OPTION */}
  <div
    style={{ ...styles.dropdownItem, fontWeight: "bold", color: "#2563eb" }}
    onClick={() => {
      setSelectedReportingTo("");   // 🔥 reset
      setShowReportingDropdown(false);
      setReportSearch("");
    }}
  >
    All Reporting
  </div>

  {reportingList
    .filter(r =>
      r.toLowerCase().includes(reportSearch.toLowerCase())
    )
    .map(r => (
      <div
        key={r}
        style={styles.dropdownItem}
        onClick={() => {
          setSelectedReportingTo(r);
          setShowReportingDropdown(false);
          setReportSearch("");
        }}
      >
        {r}
      </div>
    ))}

</div>
      <button
        style={styles.closeDropdownBtn}
        onClick={() => setShowReportingDropdown(false)}
      >
        Close
      </button>

    </div>
  )}

</div>

        <select onChange={(e)=>setSelectedDistrict(e.target.value)}>
          <option value="">All District </option>
          {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* ROLES */}
        <div style={styles.dropdownWrapper}>
          <button style={styles.dropdownBtn} onClick={()=>setShowRoleDropdown(!showRoleDropdown)}>
            Roles ({selectedRoles.length})
          </button>

          {showRoleDropdown && (
  <div style={styles.dropdownMenu}>

    {/* TOP ACTIONS */}
    <div style={styles.dropdownHeader}>
      <button style={styles.dropdownActionBtn} onClick={() => setSelectedRoles(roles)}>✓ All</button>
      <button style={styles.dropdownActionBtn} onClick={() => setSelectedRoles([])}>✕ None</button>
      <button style={styles.dropdownActionBtn} onClick={() => setShowRoleDropdown(false)}>Done</button>
    </div>

    {/* SEARCH */}
    <input
      placeholder="Search"
      value={roleSearch}
      onChange={(e) => setRoleSearch(e.target.value)}
      style={styles.input}
    />

    {/* LIST */}
    <div style={styles.dropdownList}>
      {roles
        .filter(r => r.toLowerCase().includes(roleSearch.toLowerCase()))
        .map(r => (
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

  </div>
)}

              
        </div>

        {/* BLOCKS */}
        <div style={styles.dropdownWrapper}>
          
          <button style={styles.dropdownBtn} disabled={blocksLoading} onClick={()=>setShowBlockDropdown(!showBlockDropdown)}>
            {selectedBlocks.length === 0 ? "Blocks All" : `Blocks (${selectedBlocks.length})`}
          </button>

          

                  {showBlockDropdown && (
  <div style={styles.dropdownMenu}>

    {blocksLoading ? (
      <div style={styles.loaderContainer}>
        <div className="spinner"></div>
        <span>Loading blocks...</span>
      </div>
    ) : (
      <>
        {/* HEADER */}
        <div style={styles.dropdownHeader}>
          <button style={styles.dropdownActionBtn} onClick={() => setSelectedBlocks(blocks.map(b => b.id))}>✓ All</button>
          <button style={styles.dropdownActionBtn} onClick={() => setSelectedBlocks([])}>✕ None</button>
          <button style={styles.dropdownActionBtn} onClick={() => setShowBlockDropdown(false)}>Done</button>
        </div>

        {/* SEARCH */}
        <input
          placeholder="Search"
          value={blockSearch}
          onChange={(e) => setBlockSearch(e.target.value)}
          style={styles.input}
        />

        {/* LIST */}
        <div style={styles.dropdownList}>
          {blocks
            .filter(b => b.name.toLowerCase().includes(blockSearch.toLowerCase()))
            .map(b => (
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
      </>
    )}

  </div>
)}
        </div>

        <button style={styles.downloadBtn} onClick={downloadAll}>
          {downloading ? "Downloading..." : "Download"}
        </button>

      </div>

      {/* TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Login</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Roles</th>
            <th style={styles.th}>Version</th>
            <th style={styles.th}>Reporting</th>
            <th style={styles.th}>Blocks</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {currentUsers.map((u, i) => (
            <tr key={i}
              style={styles.tr}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
              onClick={() => handleUserClick(u)}>

              <td style={styles.td}>{u.login}</td>
              <td style={styles.td}>{u.name}</td>
              <td style={styles.td}>{u.phone}</td>

              <td style={{ ...styles.td, color: u.activated ? "green" : "red", fontWeight: "bold" }}>
                {u.activated ? "Active" : "Inactive"}
              </td>

              <td style={styles.td}>
                {u.roles?.map((r, i) => <div key={i}>{r}</div>)}
              </td>

              <td style={styles.td}>{u.version}</td>
              <td style={styles.td}>{u.reportingTo}</td>


      <td style={styles.td}>            

  <div style={styles.geoBox}>

    {u.geofenceNames?.map((g,i)=>(
      <div key={i}>{g}</div>
    ))}

  </div>
  </td>
  <td style={styles.td}>

  <button
    style={styles.viewBtn}
    onClick={(e)=>{
      e.stopPropagation();
      handleUserClick(u);
    }}
  >
    👁 View
  </button>

  <button
    style={styles.editBtn}
    onClick={(e)=>{
      e.stopPropagation();
      openEditModal(u);
    }}
  >
    ✏️ Edit
  </button>

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
    <div style={styles.modalBox}>

      {/* HEADER */}
      <div style={styles.modalHeader}>
        <h3>User Details</h3>
        <button style={styles.closeBtnSmall} onClick={()=>setSelectedUser(null)}>✖</button>
      </div>

      {/* CONTENT */}
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
                        <details onClick={(e)=>e.stopPropagation()}>
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
                  <td>
                    {Array.isArray(value)
                      ? value.join(", ")
                      : value?.toString()}
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>

    </div>
  </div>
)}
{editUser && (
  <div style={styles.modalOverlay}>
    <div style={{...styles.modalBox, width:"600px"}}>

      <div style={styles.modalHeader}>
        <h3>Edit User</h3>
        <button style={styles.closeBtnSmall} onClick={()=>setEditUser(null)}>✖</button>
      </div>

      <div style={styles.scrollBox}>

        <div style={{marginBottom: "15px"}}>
          <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>First Name</label>
          <input
            placeholder="First Name"
            style={{...styles.input, width: "100%", boxSizing: "border-box"}}
            value={editUser?.firstName || ""}
            onChange={(e)=>setEditUser({...editUser, firstName:e.target.value})}
          />
        </div>

        <div style={{marginBottom: "15px"}}>
          <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>Last Name</label>
          <input
            placeholder="Last Name"
            style={{...styles.input, width: "100%", boxSizing: "border-box"}}
            value={editUser?.lastName || ""}
            onChange={(e)=>setEditUser({...editUser, lastName:e.target.value})}
          />
        </div>

        <div style={{marginBottom: "15px"}}>
          <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>Phone</label>
          <input
            placeholder="Phone"
            style={{...styles.input, width: "100%", boxSizing: "border-box"}}
            value={editUser?.phone || ""}
            onChange={(e)=>setEditUser({...editUser, phone:e.target.value})}
          />
        </div>
{/* EMAIL */}
<div style={{marginBottom: "15px"}}>
  <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>Email</label>
  <input
    placeholder="Email"
    style={{...styles.input, width: "100%", boxSizing: "border-box"}}
    value={editUser?.email || ""}
    onChange={(e)=>setEditUser({...editUser, email:e.target.value})}
  />
</div>
{/* ✅ GPS IMEI (ADD HERE) */}
<div style={{marginBottom: "15px"}}>
  <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>GPS IMEI</label>
  <input
    placeholder="GPS IMEI"
    style={{...styles.input, width: "100%", boxSizing: "border-box"}}
    value={editUser?.gpsimei || ""}
    onChange={(e)=>setEditUser({...editUser, gpsimei:e.target.value})}
  />
</div>

        

        {/* BLOCKS */}
        <div style={{marginBottom: "15px"}}>
          <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>Blocks ({selectedBlocks?.length || 0} selected)</label>
          <div style={{maxHeight:"200px", overflowY:"auto", border:"1px solid #ccc", padding: "8px", borderRadius: "4px", backgroundColor: "#fafafa"}}>
            {blocks && blocks.length > 0 ? (
              blocks.map(b => (
                <label key={b.id} style={{display:"block", marginBottom: "8px", cursor: "pointer", padding: "4px", borderRadius: "3px", backgroundColor: selectedBlocks.includes(b.id) ? "#e3f2fd" : "transparent"}}>
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
              ))
            ) : (
              <p style={{color: "#999"}}>Loading blocks...</p>
            )}
          </div>
        </div>

        {/* ROLES */}
        <div style={{marginBottom: "15px"}}>
          <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>Roles</label>
          <div style={{maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", padding: "8px", borderRadius: "4px", backgroundColor: "#fafafa"}}>
            {Array.isArray(rolesList) && rolesList.length > 0 ? (
              rolesList.map(r => (
                <label key={r.name} style={{display: "block", marginBottom: "8px", cursor: "pointer"}}>
                  <input
                    type="checkbox"
                    checked={selectedRolesEdit.includes(r.name)}
                    onChange={() => {
                      setSelectedRolesEdit(prev =>
                        prev.includes(r.name)
                          ? prev.filter(x => x !== r.name)
                          : [...prev, r.name]
                      );
                    }}
                  />
                  {r.name}
                </label>
              ))
            ) : (
              <p style={{color: "#999"}}>Loading roles...</p>
            )}
          </div>
        </div>

        {/* REPORTING */}
        <div style={{marginBottom: "15px"}}>
          <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>Reporting To</label>
          <select
            style={{...styles.input, width: "100%", boxSizing: "border-box"}}
            value={selectedReportingEdit?.id || ""}
            onChange={(e) => {
              const selected = Array.isArray(reportingListEdit) ? reportingListEdit.find(r => r.id == e.target.value) : null;
              setSelectedReportingEdit(selected);
            }}
          >
            <option value="">Select Reporting Manager</option>
            {Array.isArray(reportingListEdit) && reportingListEdit.map(r => (
              <option key={r.id} value={r.id}>
                {r.login} ({r.firstName} {r.lastName})
              </option>
            ))}
          </select>
        </div>

        {/* DEBUG INFO */}
        <div style={{marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "4px", fontSize: "12px", color: "#666"}}>
          <p><strong>Debug Info:</strong></p>
          <p>✅ User: {editUser?.login}</p>
          <p>✅ Roles loaded: {rolesList?.length || 0} | Selected: {selectedRolesEdit?.length || 0}</p>
          <p>✅ Reporting: {reportingListEdit?.length || 0} | Selected: {selectedReportingEdit?.login || "None"}</p>
          <p>✅ Blocks loaded: {blocks?.length || 0} | Selected: {selectedBlocks?.length || 0}</p>
          <p><strong>Payload will send:</strong></p>
          <p>• geofences: {JSON.stringify(selectedBlocks)}</p>
          <p>• authorities: {JSON.stringify(selectedRolesEdit)}</p>
        </div>

      </div>

      <div style={{marginTop: "10px"}}>
        <button style={styles.editBtn} onClick={handleUpdate}>Save</button>
        <button onClick={()=>setEditUser(null)}>Cancel</button>
      </div>

    </div>
  </div>
)}
  </div>
  );
}

const styles = {
  page:{padding:"20px"},
  filters:{display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center",overfloewX:"auto"},
  input:{padding:"8px"},
  dropdownWrapper:{position:"relative"},
  dropdownBtn:{padding:"8px",border:"1px solid #ccc",cursor:"pointer"},
  dropdownMenu:{position:"absolute",top:"40px",background:"white",border:"1px solid #ccc",padding:"10px"},
  dropdownList: {
  maxHeight: "200px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "5px"
},
viewBtn: {
  padding: "5px",
  marginRight: "5px",
  background: "green",
  color: "white",
  border: "none",
  cursor: "pointer"
},

editBtn: {
  padding: "5px",
  background: "blue",
  color: "white",
  border: "none",
  cursor: "pointer"
},
  dropdownItem:{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",padding:"4px 2px"},
  selectAll:{fontWeight:"bold",color:"blue",cursor:"pointer"},
  closeDropdownBtn:{marginTop:"5px"},
  downloadBtn:{background:"#2563eb",color:"white",padding:"8px"},
  loaderContainer:{display:"flex",justifyContent:"center",gap:"10px"},
  spinner:{width:"18px",height:"18px",border:"3px solid #ccc",borderTop:"3px solid blue",borderRadius:"50%"},modalOverlay: {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999   // 🔥 IMPORTANT FIX
},

modalBox: {
  background: "white",
  width: "600px",
  maxHeight: "80vh",
  borderRadius: "10px",
  padding: "15px",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
},

modalHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #eee",
  marginBottom: "10px"
},
loaderContainer:{
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  gap:"10px",
  margin:"15px 0"
},


scrollBox: {
  overflowY: "auto",
  maxHeight: "60vh"
},

detailTable: {
  width: "100%",
  borderCollapse: "collapse"
},
dropdownItem: {
  padding: "6px",
  cursor: "pointer"
},

input: {
  padding: "8px",
  width: "180px",
  marginBottom: "5px",
  border: "1px solid #ccc",
  borderRadius: "5px"
},
key: {
  fontWeight: "bold",
  width: "40%",
  padding: "8px",
  borderBottom: "1px solid #eee"
},

closeBtnSmall: {
  background: "red",
  color: "white",
  border: "none",
  padding: "4px 8px",
  fontSize: "12px",
  borderRadius: "5px",
  cursor: "pointer"
},table: {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
  fontSize: "14px"
},

th: {
  background: "#f3f4f6",
  padding: "12px",
  border: "1px solid #ddd",
  textAlign: "left",
  fontWeight: "600"
},

td: {
  padding: "10px",
  border: "1px solid #ddd",
  verticalAlign: "top"
},

tr: {
  cursor: "pointer",
  transition: "background 0.2s ease"
},

// hover effect
trHover: {
  backgroundColor: "#f9fafb"
},pagination:{
  display:"flex",
  justifyContent:"center",
  alignItems:"center",
  gap:"10px",
  marginTop:"20px"
},

pageBtn:{
  padding:"6px 12px",
  border:"1px solid #ccc",
  borderRadius:"5px",
  cursor:"pointer"
},
input: {
  padding: "8px",
  width: "180px",
  marginBottom: "5px",
  border: "1px solid #ccc",
  borderRadius: "5px"
},

dropdownItem: {
  padding: "6px",
  cursor: "pointer"
},

loaderContainer:{
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  gap:"10px",
  margin:"15px 0"
},
dropdownHeader: {
  display: "flex",

  marginBottom: "8px",
  gap: "6px"
},dropdownWrapper: {
  position: "relative",
  width: "200px"
  // 🔥 FIX: give equal width
},

dropdownBtn: {
  width: "100%",   // 🔥 full width button
  padding: "8px",
  border: "1px solid #ccc",
  cursor: "pointer",
  textAlign: "left"
},

dropdownMenu: {
  position: "absolute",
  top: "100%",        // 🔥 instead of fixed 40px
  left: 0,
  width: "100%",      // 🔥 match button width
  background: "white",
  border: "1px solid #ccc",
  padding: "10px",
  zIndex: 1000,       // 🔥 prevents overlap issues
  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  borderRadius: "6px"
},
dropdownActionBtn: {
  padding: "4px 8px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px",
  background: "#f5f5f5"
},geoBox: {
  maxHeight: "60px",        // 🔥 fixed height
  overflowY: "auto",
  paddingRight: "5px"
}
};
export default UsersTable;