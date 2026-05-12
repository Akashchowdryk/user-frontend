import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Tree, TreeNode } from "react-organizational-chart";
import { useDrag, useDrop } from "react-dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { FaEye, FaEdit } from "react-icons/fa";



// ✅ SAFE HELPER: ensures a block is valid and has a plain string name
const isValidBlock = (b) =>
  b &&
  b.id !== undefined &&
  b.id !== null &&
  b.name !== undefined &&
  b.name !== null &&
  typeof b.name === "string" &&
  b.name.trim() !== "";

function UsersTable() {

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedReportingTo, setSelectedReportingTo] = useState("");

  
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

  const [editBlockSearch, setEditBlockSearch] = useState("");
  const [editRoleSearch, setEditRoleSearch] = useState("");

  const [reportingList, setReportingList] = useState([]);
  const [showReportingDropdown, setShowReportingDropdown] = useState(false);
  const [reportSearch, setReportSearch] = useState("");

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  
  const [editUser, setEditUser] = useState(null);

  const [rolesList, setRolesList] = useState([]);
  const [reportingListEdit, setReportingListEdit] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingReporting, setLoadingReporting] = useState(false);

  const [selectedRolesEdit, setSelectedRolesEdit] = useState([]);
  const [selectedReportingEdit, setSelectedReportingEdit] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
const [bulkReportingTo, setBulkReportingTo] = useState("");
const [showBulkPopup, setShowBulkPopup] = useState(false);
const [updatedUsers, setUpdatedUsers] = useState([]);
const [showBulkDropdown, setShowBulkDropdown] = useState(false);
const [bulkReportSearch, setBulkReportSearch] = useState("");
const [usersPerPage, setUsersPerPage] = useState(10);
const [showFilters, setShowFilters] = useState(false);
const [showHierarchy, setShowHierarchy] = useState(false);
const [hierarchyData, setHierarchyData] = useState([]);
const [hierarchyLoading, setHierarchyLoading] = useState(false);
const [expandedNodes, setExpandedNodes] = useState({});
const [expanded, setExpanded] = useState({});
const [loadingNodes, setLoadingNodes] = useState({});

const [zoom, setZoom] = useState(1);
const [position, setPosition] = useState({ x: 0, y: 0 });
const [isPanning, setIsPanning] = useState(false);
const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
const [hierarchyEditUser, setHierarchyEditUser] = useState(null);
const [hierarchyReporting, setHierarchyReporting] = useState("");
const [hierarchyReportSearch, setHierarchyReportSearch] = useState("");
const [showHierarchyDropdown, setShowHierarchyDropdown] = useState(false);
const [hierarchyKey, setHierarchyKey] = useState(0);
const [loading, setLoading] = useState(false);

const [hierarchySearch, setHierarchySearch] = useState("");
const [highlightedUser, setHighlightedUser] = useState("");
const [searchingHierarchy, setSearchingHierarchy] = useState(false);

const openHierarchyEdit = (node) => {
  setHierarchyEditUser(node);

  // 🔥 find matching reporting user from list
  const current = reportingListEdit.find(
    r => r.login === node.reportingTo || r.id === node.reportingTo
  );

  setHierarchyReporting(current?.id || "");
};


  




  // ✅ SAFE HELPER: safely get block name as string
  const safeBlockName = (b) => {
    if (!b) return "No name";
    if (typeof b.name === "string") return b.name;
    return "No name";
  };
const HierarchyNode = ({
  node,
  reloadAllData,
  setLoading,
  expanded,
  setExpanded,
  loadChildren
}) => {

  // DRAG
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "USER",
    item: node,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  // DROP
  const [, drop] = useDrop(() => ({

    accept: "USER",

    drop: async (draggedUser) => {

      if (draggedUser.login === node.login) return;

      try {

        setLoading(true);

        const userRes = await axios.get(
          `https://user-extract.onrender.com/api/user/${draggedUser.login}`
        );

        const user = userRes.data;

        const payload = {
          id: user.id,
          login: user.login,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: user.phone || "",
          gpsimei: user.gpsimei || "",
          activated: user.activated ?? true,
          authorities: user.authorities || [],
          geofences: user.geofences?.map(g => g.id || g) || [],
          reportingTo: node.id,
          langKey: user.langKey || "en"
        };

        await axios.put(
          "https://user-extract.onrender.com/api/edit-user",
          payload
        );

        alert("Hierarchy Updated ✅");

        await reloadAllData();

      } catch (err) {

        console.error(err);
        alert("Update failed ❌");

      } finally {

        setLoading(false);
      }
    }
  }));

  return (

    <div
      ref={drop}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >

      {/* USER NODE */}
      <div
        ref={drag}
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          background:
  highlightedUser === node.login
    ? "#f59e0b"
    : node.hasChildren
      ? "#16a34a"
      : "#2563eb",
          color: "white",
          cursor: "grab",
          opacity: isDragging ? 0.5 : 1,
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          minWidth: "120px",
          textAlign: "center"
        }}
      >
        {node.login}
      </div>

      {/* EXPAND BUTTON */}
      {node.hasChildren && (

  <div

    onMouseDown={async (e) => {

      e.preventDefault();
      e.stopPropagation();

      console.log("EXPAND CLICKED:", node.login);

      // collapse
      if (expanded[node.login]) {

        setExpanded(prev => ({
          ...prev,
          [node.login]: false
        }));

        return;
      }

      // load children
      await loadChildren(node.login);
      await new Promise(resolve =>
  setTimeout(resolve, 300)
);
      // expand
      setExpanded(prev => ({
        ...prev,
        [node.login]: true
      }));

    }}

    style={{
      marginTop: "8px",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      background: "#2563eb",
      color: "white",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      userSelect: "none"
    }}
  >
    {expanded[node.login] ? "−" : "+"}
  </div>

)}

    </div>
  );
};
const updateHierarchyReporting = async () => {
  if (!hierarchyEditUser) return;

  try {
    // 🔹 your existing update logic
    const userRes = await axios.get(
      `https://user-extract.onrender.com/api/user/${hierarchyEditUser.login}`
    );

    const user = userRes.data;
    

    const payload = {
      id: user.id,
      login: user.login,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      gpsimei: user.gpsimei || "",
      activated: user.activated ?? true,
      authorities: user.authorities || [],
      geofences: user.geofences?.map(g => g.id || g) || [],
      reportingTo: Number(hierarchyReporting),
      langKey: user.langKey || "en"
    };

    await axios.put(
      "https://user-extract.onrender.com/api/edit-user",
      payload
    );
    // 🔥 refresh all app data
await reloadAllData();

// close modal
setHierarchyEditUser(null);

alert("Updated Successfully ✅");

   

  } catch (err) {
    console.error(err);
    alert("Update failed ❌");
  }
};
const loadChildren = async (login) => {

  try {

    setLoadingNodes(prev => ({
      ...prev,
      [login]: true
    }));

    const res = await axios.get(
      `https://user-extract.onrender.com/api/hierarchy/children/${login}`
    );
const children = Array.isArray(res.data)
  ? res.data.map(c => ({
      ...c,
      children: c.children || []
    }))
  : [];
    const updateTree = (nodes) => {

      return nodes.map(n => {

        if (n.login === login) {

          return {
            ...n,
            children
          };
        }

        if (n.children) {

          return {
            ...n,
            children: updateTree(n.children)
          };
        }

        return n;
      });
    };

    setHierarchyData(prev => [...updateTree(prev)]);
    await new Promise(resolve =>
  setTimeout(resolve, 200)
);
    setHierarchyKey(prev => prev + 1);

  } catch (err) {

    console.error(err);

  } finally {

    setLoadingNodes(prev => ({
      ...prev,
      [login]: false
    }));
  }
};
const searchHierarchyUser = async (searchLogin) => {

  if (!searchLogin) return;

  setSearchingHierarchy(true);
  setHighlightedUser(searchLogin);

  const expandedMap = {};

  // recursive API traversal
  const traverse = async (login, path = []) => {

    // current path
    const currentPath = [...path, login];

    // found target
    if (
      login.toLowerCase() ===
      searchLogin.toLowerCase()
    ) {

      currentPath.forEach(p => {
        expandedMap[p] = true;
      });

      return true;
    }

    try {

      // fetch children directly
      const res = await axios.get(
        `https://user-extract.onrender.com/api/hierarchy/children/${login}`
      );

      const children = Array.isArray(res.data)
        ? res.data
        : [];

      // update tree visually
      setHierarchyData(prev => {

        const updateTree = (nodes) => {

          return nodes.map(n => {

            if (n.login === login) {

              return {
                ...n,
                children
              };
            }

            return {
              ...n,
              children: n.children
                ? updateTree(n.children)
                : []
            };
          });
        };

        return updateTree(prev);
      });

      // search children
      for (const child of children) {

        const found = await traverse(
          child.login,
          currentPath
        );

        if (found) return true;
      }

    } catch (err) {

      console.error(err);
    }

    return false;
  };

  // start from roots
  for (const root of hierarchyData) {

    const found = await traverse(root.login);

    if (found) break;
  }

  // apply all expansions together
  setExpanded(expandedMap);

  // force rerender
  setHierarchyKey(prev => prev + 1);
  setSearchingHierarchy(false);
};
const renderOrgTree = (node) => {

  const isExpanded = expanded[node.login];

  return (

    <TreeNode
  key={`${node.login}-${node.children?.length || 0}`}
  label={
    <div style={{ textAlign: "center" }}>
      <HierarchyNode
        node={node}
        reloadAllData={reloadAllData}
        setLoading={setLoading}
        expanded={expanded}
        setExpanded={setExpanded}
        loadChildren={loadChildren}
      />
    </div>
  }
>
{expanded[node.login] === true &&
  Array.isArray(node.children) &&
  node.children.length > 0 &&
  node.children.map(child => renderOrgTree(child))
}

</TreeNode>
  );
};
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
  useEffect(() => {
  const reopen = localStorage.getItem("reopenHierarchy");

  if (reopen === "true") {
    setShowHierarchy(true);

    localStorage.removeItem("reopenHierarchy");
  }
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
        const validBlocks = Array.isArray(res.data)
          ? res.data.filter(isValidBlock)
          : [];
        setBlocks(validBlocks);
        setSelectedBlocks(validBlocks.map(b => b.id));
      })
      .catch(err => {
        console.error("Error loading blocks:", err);
        setBlocks([]);
        setSelectedBlocks([]);
      })
      .finally(() => setBlocksLoading(false));

  }, [selectedDistrict]);
  useEffect(() => {
  axios.get("https://user-extract.onrender.com/api/reporting-users")
    .then(res => setReportingListEdit(res.data || []))
    .catch(() => setReportingListEdit([]));
}, []);

  // RESET PAGE
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedReportingTo, selectedDistrict, selectedRoles, selectedBlocks]);

  // FILTER
  const filteredUsers = users.length === 0 ? [] : users.filter(user => {

    const searchText = search.toLowerCase();

    const matchSearch =
      user.login?.toLowerCase().includes(searchText) ||
      (user.name && user.name.toLowerCase().includes(searchText)) ||
      (user.phone && user.phone.toString().toLowerCase().includes(searchText));

    const matchReporting =
      !selectedReportingTo || user.reportingTo === selectedReportingTo;

    const matchRoles =
      selectedRoles.length === 0 ||
      selectedRoles.some(r => user.roles?.includes(r));

    const matchBlocks =
      !selectedDistrict ||
      (Array.isArray(selectedBlocks) && selectedBlocks.length > 0 &&
        selectedBlocks.some(id => {
          const block = Array.isArray(blocks) && blocks.find(b => b.id === id);
          return block && typeof block.name === "string" && user.geofenceNames?.includes(block.name);
        }));

    const matchDistrict =
      !selectedDistrict ||
      (Array.isArray(blocks) && blocks.some(b =>
        typeof b.name === "string" && user.geofenceNames?.includes(b.name)
      ));

    return matchSearch && matchReporting && matchRoles && matchBlocks && matchDistrict;
  });
  const cleanStyles = {
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },

  modalBox: {
    width: "420px",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
  },

  header: {
    marginBottom: "10px"
  },

  userText: {
    marginBottom: "15px",
    fontSize: "14px"
  },

  dropdownContainer: {
    position: "relative"
  },

  selectBox: {
    border: "1px solid #ccc",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer",
    background: "#f9fafb"
  },

  dropdown: {
    position: "absolute",
    width: "100%",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "6px",
    marginTop: "5px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 1000
  },

  searchInput: {
    width: "100%",
    padding: "8px",
    border: "none",
    borderBottom: "1px solid #eee",
    outline: "none"
  },

  list: {
    maxHeight: "180px",
    overflowY: "auto"
  },

  listItem: {
    padding: "10px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f1f1"
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px"
  },

  saveBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer"
  },

  cancelBtn: {
    background: "#e5e7eb",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer"
  }
};

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );
 const handleBulkUpdate = async () => {

  if (selectedUsers.length === 0) {
    alert("Select users ❌");
    return;
  }

  if (!bulkReportingTo) {
    alert("Select reporting user ❌");
    return;
  }

  try {
    await axios.put(
      "https://user-extract.onrender.com/api/bulk-update-reporting",
      {
        logins: selectedUsers,
        reportingTo: Number(bulkReportingTo)
      }
    );

    setUpdatedUsers(selectedUsers);
    setShowBulkPopup(true);

    // 🔥 RESET UI STATE
    setSelectedUsers([]);
    setBulkReportingTo("");

    // 🔥 MOST IMPORTANT FIX
    await reloadAllData();   // ✅ NOT reloadHierarchy()

  } catch (err) {
    console.error(err);
    alert("Bulk update failed ❌");
  }
};

  const openEditModal = (user) => {

    setLoadingRoles(true);
    setLoadingReporting(true);

    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => {

        const fullUser = res.data;

        const cleanUser = {
          id: fullUser.id,
          login: fullUser.login,
          firstName: fullUser.firstName || "",
          lastName: fullUser.lastName || "",
          email: fullUser.email || "",
          phone: fullUser.phone || "",
          gpsimei: fullUser.gpsimei || "",
          activated: fullUser.activated ?? true,
          authorities: fullUser.authorities || [],
          ownedBy: fullUser.ownedBy || [],
          geofences: fullUser.geofences || [],
          langKey: fullUser.langKey || "en"
        };

        setEditUser(cleanUser);

        setSelectedRolesEdit(cleanUser.authorities || []);
        setEditBlockSearch("");
        setEditRoleSearch("");

        const geoIds = Array.isArray(cleanUser.geofences)
          ? cleanUser.geofences.map(g =>
              typeof g === "object" ? g.id : g
            )
          : [];
        setSelectedBlocks(geoIds);

        // Fetch Blocks for edit modal
        axios.get("https://user-extract.onrender.com/api/geofences")
  .then(res => {

    const masters = Array.isArray(res.data?.masters) ? res.data.masters : [];
const minis = Array.isArray(res.data?.minis) ? res.data.minis : [];


const allBlocks = [...masters, ...minis];

// ✅ apply validation
const validBlocks = allBlocks.filter(isValidBlock);

setBlocks(validBlocks);

console.log("BLOCKS LOADED:", validBlocks.length);

   
  })
  .catch(err => {
    console.error("Error loading blocks:", err);
    setBlocks([]);
  });
        // Fetch Roles
        axios.get("https://user-extract.onrender.com/api/roles")
          .then(res => {
            console.log("ROLES API RESPONSE:", res.data);
            setRolesList(Array.isArray(res.data) ? res.data : []);
          })
          .catch(err => {
            console.error("Error loading roles:", err);
            setRolesList([]);
          })
          .finally(() => setLoadingRoles(false));

        // Fetch Reporting
        axios.get("https://user-extract.onrender.com/api/reporting-users")
          .then(res => {
            const list = Array.isArray(res.data) ? res.data : [];
            setReportingListEdit(list);

            const reportingId = cleanUser.ownedBy?.[0]?.id;
            const selected = list.find(x => x.id === reportingId);
            setSelectedReportingEdit(selected || null);
          })
          .finally(() => setLoadingReporting(false));

      })
      .catch(err => {
        console.error("Error loading user:", err);
        alert("Failed to load user details ❌");
        setLoadingRoles(false);
        setLoadingReporting(false);
      });
  };

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
    authorities: Array.isArray(selectedRolesEdit)
      ? selectedRolesEdit
          .map(r => typeof r === "string" ? r : r?.configValue || r?.name || "")
          .filter(Boolean)
      : [],
    geofences: selectedBlocks,
    reportingTo: selectedReportingEdit?.id || null,
    langKey: editUser.langKey || "en"
  };

  console.log("FINAL PAYLOAD:", payload);

  try {

    // ✅ SINGLE API CALL ONLY
    await axios.put(
      "https://user-extract.onrender.com/api/edit-user",
      payload
    );

    // ✅ CLOSE MODAL
    setEditUser(null);

    // ✅ RESET BLOCKS (OPTIONAL - KEEP IF YOU NEED FILTER RESET)
    setBlocks([]);
    setSelectedBlocks([]);

    // 🔥 MOST IMPORTANT FIX
    await reloadAllData();

    alert("User Updated Successfully ✅");

  } catch (err) {
    console.error("ERROR RESPONSE:", err.response?.data);
    console.error("ERROR STATUS:", err.response?.status);
    console.error("ERROR MESSAGE:", err.message);

    alert("Update Failed ❌");
  }
};

  const handleUserClick = (user) => {
    axios.get(`https://user-extract.onrender.com/api/user/${user.login}`)
      .then(res => setSelectedUser(res.data));
  };

  const downloadAll = () => {
    setDownloading(true);

    const dataToExport = filteredUsers.map(u => ({
      Login: u.login,
      Name: u.name,
      Phone: u.phone,
      Status: u.activated ? "Active" : "Inactive",
      Roles: u.roles?.join(", "),
      Version: u.version,
      Reporting: u.reportingTo,
      Geofences: u.geofenceNames?.join(", ")
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "Filtered_Users.xlsx");

    setDownloading(false);
  };
 
const handleWheel = (e) => {

  const delta = e.deltaY > 0 ? -0.1 : 0.1;

  setZoom(prev => {

    let newZoom = prev + delta;

    if (newZoom < 0.3) newZoom = 0.3;
    if (newZoom > 3) newZoom = 3;

    return newZoom;
  });
};
const handleMouseDown = (e) => {

  setIsPanning(true);

  setStartPoint({
    x: e.clientX - position.x,
    y: e.clientY - position.y
  });
};

const handleMouseMove = (e) => {

  if (!isPanning) return;

  setPosition({
    x: e.clientX - startPoint.x,
    y: e.clientY - startPoint.y
  });
};

const handleMouseUp = () => {
  setIsPanning(false);
};
const reloadAllData = async () => {

  setLoading(true);

  try {

    const cb = Date.now();

    const [usersRes, hierarchyRes] = await Promise.all([
      axios.get(
        `https://user-extract.onrender.com/api/users-summary?cb=${cb}`
      ),
      axios.get(
        `https://user-extract.onrender.com/api/hierarchy/root?cb=${cb}`
      )
    ]);

    setUsers(usersRes.data);
   setHierarchyData(
  Array.isArray(hierarchyRes.data)
    ? hierarchyRes.data
    : [hierarchyRes.data]
);

  } catch (err) {

    console.error(err);

  } finally {

    setLoading(false);

  }
};

  return (
    <div style={styles.page}>
<h2>User Dashboard(s)</h2>

<div style={styles.topBar}>

  {/* 🔍 SEARCH */}
  <div style={styles.searchWrapper}>
    <span style={styles.searchIcon}>🔍</span>
    <input
      placeholder="Search users..."
      style={styles.searchInput}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  {/* BUTTONS */}
  <div style={styles.topActions}>
    <button
      style={styles.primaryBtn}
      onClick={() => setShowFilters(prev => !prev)}
    >
      ☰ Filters
    </button>

    <button
      style={styles.secondaryBtn}
      onClick={() => {
  setShowHierarchy(true);
  setHierarchyLoading(true);

  axios.get("https://user-extract.onrender.com/api/hierarchy/root")
    .then(res => {

  setHierarchyData(
  Array.isArray(res.data)
    ? res.data
    : [res.data]
);

  
})
    
    .catch(err => {
      console.error("Hierarchy API error:", err);
      setHierarchyData([]); // prevent crash
      alert("Hierarchy API not available ❌");
    })
    .finally(() => setHierarchyLoading(false));
}}
    >
       Hierarchy
    </button>
  </div>

</div>

      {/* BULK CARD */}
{selectedUsers.length > 0 && (
  <div style={{
    border: "1px solid #ccc",
    padding: "10px",
    marginTop: "10px",
    borderRadius: "6px",
    background: "#f9fafb"
  }}>
    <h4>Selected Users ({selectedUsers.length})</h4>

    {/* ✅ USER CHIPS WITH REMOVE */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
      {selectedUsers.map(login => (
        <span key={login} style={{ ...styles.chip, display: "flex", alignItems: "center", gap: "5px" }}>
          {login}
          <span
            style={{ cursor: "pointer", color: "blue", fontWeight: "bold" }}
            onClick={() =>
              setSelectedUsers(prev => prev.filter(u => u !== login))
            }
          >
            ✖
          </span>
        </span>
      ))}
    </div>

    {/* ✅ CUSTOM DROPDOWN WITH SEARCH INSIDE */}
    <div style={{ position: "relative", width: "250px", marginBottom: "10px" }}>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "8px",
          cursor: "pointer",
          background: "white"
        }}
        onClick={() => setShowBulkDropdown(prev => !prev)}
      >
        {bulkReportingTo
          ? reportingListEdit.find(r => r.id == bulkReportingTo)?.login
          : "Select Reporting To"}
      </div>

      {showBulkDropdown && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          width: "100%",
          background: "white",
          border: "1px solid #ccc",
          zIndex: 1000,
          padding: "8px"
        }}>

          {/* 🔍 SEARCH INSIDE DROPDOWN */}
          <input
            placeholder="Search..."
            value={bulkReportSearch}
            onChange={(e) => setBulkReportSearch(e.target.value)}
            style={{ ...styles.input, width: "100%", boxSizing: "border-box", marginBottom: "8px" }}
          />

          <div style={{ maxHeight: "150px", overflowY: "auto" }}>
            {reportingListEdit
              .filter(r =>
                r.login?.toLowerCase().includes(bulkReportSearch.toLowerCase())
              )
              .map(r => (
                <div
                  key={r.id}
                  style={{ padding: "6px", cursor: "pointer" }}
                  onClick={() => {
                    setBulkReportingTo(r.id);
                   setShowBulkDropdown(false);
                    setBulkReportSearch("");
                  }}
                >
                  {r.login} ({r.firstName} {r.lastName})
                </div>
              ))}
          </div>

        </div>
      )}
    </div>

    {/* ✅ ACTION BUTTONS */}
    <div style={{ display: "flex", gap: "10px" }}>

      <button
        style={styles.editBtn}
        onClick={handleBulkUpdate}
      >
        Update Reporting
      </button>

      {/* ❌ REMOVE ALL BUTTON BESIDE */}
      <button
        style={{ background: "red", color: "white", border: "none", padding: "5px 10px", cursor: "pointer" }}
        onClick={() => setSelectedUsers([])}
      >
        Remove All
      </button>

    </div>
  </div>
)}
{showBulkPopup && (
  <div style={styles.modalOverlay}>
    <div style={styles.modalBox}>

      <h3>Reporting Updated ✅</h3>

      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
        {updatedUsers.map(u => (
          <div key={u}>{u}</div>
        ))}
      </div>

      <button onClick={() => setShowBulkPopup(false)}>
        Close
      </button>

    </div>
  </div>
)}
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
      

       
        {showFilters && (
  <div style={styles.filterPanel}>

        <div style={styles.dropdownWrapper}>
          <button
            style={styles.dropdownBtn}
            onClick={() => setShowReportingDropdown(!showReportingDropdown)}
          >
            {selectedReportingTo || "Reporting To"}
          </button>

          {showReportingDropdown && (
            <div style={styles.dropdownMenu}>
              <input
                type="text"
                placeholder="Search..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                style={styles.input}
              />
              <div style={styles.dropdownList}>
                <div
                  style={{ ...styles.dropdownItem, fontWeight: "bold", color: "#2563eb" }}
                  onClick={() => {
                    setSelectedReportingTo("");
                    setShowBulkDropdown(false);
                    setReportSearch("");
                  }}
                >
                  All Reporting
                </div>
                {reportingList
                  .filter(r => r.toLowerCase().includes(reportSearch.toLowerCase()))
                  .map(r => (
                    <div
                      key={r}
                      style={styles.dropdownItem}
                      onClick={() => {
                        setSelectedReportingTo(r);
                        setShowBulkDropdown(false);
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

        <select onChange={(e) => setSelectedDistrict(e.target.value)}>
          <option value="">All District</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* ROLES */}
        <div style={styles.dropdownWrapper}>
          <button style={styles.dropdownBtn} onClick={() => setShowRoleDropdown(!showRoleDropdown)}>
            Roles ({selectedRoles.length})
          </button>

          {showRoleDropdown && (
            <div style={styles.dropdownMenu}>
              <div style={styles.dropdownHeader}>
                <button style={styles.dropdownActionBtn} onClick={() => setSelectedRoles(roles)}>✓ All</button>
                <button style={styles.dropdownActionBtn} onClick={() => setSelectedRoles([])}>✕ None</button>
                <button style={styles.dropdownActionBtn} onClick={() => setShowRoleDropdown(false)}>Done</button>
              </div>
              <input
                placeholder="Search"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                style={styles.input}
              />
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
          <button style={styles.dropdownBtn} disabled={blocksLoading} onClick={() => setShowBlockDropdown(!showBlockDropdown)}>
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
                  <div style={styles.dropdownHeader}>
                    <button style={styles.dropdownActionBtn} onClick={() => setSelectedBlocks(Array.isArray(blocks) ? blocks.map(b => b.id) : [])}>✓ All</button>
                    <button style={styles.dropdownActionBtn} onClick={() => setSelectedBlocks([])}>✕ None</button>
                    <button style={styles.dropdownActionBtn} onClick={() => setShowBlockDropdown(false)}>Done</button>
                  </div>
                  <input
                    placeholder="Search"
                    value={blockSearch}
                    onChange={(e) => setBlockSearch(e.target.value)}
                    style={styles.input}
                  />
                  <div style={styles.dropdownList}>
                    {Array.isArray(blocks) && blocks
                      .filter(b => isValidBlock(b) && b.name.toLowerCase().includes(blockSearch.toLowerCase()))
                      .map(b => (
                        <label key={b.id} style={styles.dropdownItem}>
                          <input
                            type="checkbox"
                            checked={Array.isArray(selectedBlocks) && selectedBlocks.includes(b.id)}
                            onChange={() =>
                              setSelectedBlocks(prev =>
                                prev.includes(b.id)
                                  ? prev.filter(id => id !== b.id)
                                  : [...prev, b.id]
                              )
                            }
                          />
                          {safeBlockName(b)}
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
)}

      {/* TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
          <th style={styles.th}>
  <input
    type="checkbox"
    checked={
      filteredUsers.length > 0 &&
      filteredUsers.every(u => selectedUsers.includes(u.login))
    }
    onChange={(e) => {
      if (e.target.checked) {
        // ✅ SELECT ALL FILTERED USERS (ALL PAGES)
        const allLogins = filteredUsers.map(u => u.login);
        setSelectedUsers(allLogins);
      } else {
        // ❌ UNSELECT ALL FILTERED USERS
        const allLogins = filteredUsers.map(u => u.login);
        setSelectedUsers(prev =>
          prev.filter(login => !allLogins.includes(login))
        );
      }
    }}
  />
</th>
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
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                <td style={styles.td}>
    <input
      type="checkbox"
      checked={selectedUsers.includes(u.login)}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedUsers(prev => [...prev, u.login]);
        } else {
          setSelectedUsers(prev => prev.filter(l => l !== u.login));
        }
      }}
    />
  </td>

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
                  {u.geofenceNames?.map((g, i) => (
                    <div key={i}>{typeof g === "string" ? g : ""}</div>
                  ))}
                </div>
              </td>

              <td style={styles.td}>
                <button
    className="icon-btn view"
    onClick={() => handleUserClick(u)}
    title="View User"
  >
    <FaEye />
  </button>

                 <button
    className="icon-btn edit"
    onClick={() => openEditModal(u)}
    title="Edit User"
  >
    <FaEdit />
  </button>
              </td>
              

            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINATION */}
     <div style={styles.paginationContainer}>

  {/* LEFT SIDE */}
  <div style={styles.paginationLeft}>
    
    {/* Page Size */}
    <div>
      Page size{" "}
      <select
        value={usersPerPage}
        onChange={(e) => {
          setCurrentPage(1);
          setUsersPerPage(Number(e.target.value));
        }}
        style={styles.select}
      >
        {[10, 20, 50, 100].map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </div>

    {/* Showing Count */}
    <div>
      Showing{" "}
      {filteredUsers.length === 0
        ? 0
        : (currentPage - 1) * usersPerPage + 1}
      {" - "}
      {Math.min(currentPage * usersPerPage, filteredUsers.length)}
      {" of "}
      {filteredUsers.length} items.
    </div>

  </div>

  {/* RIGHT SIDE */}
  <div style={styles.paginationRight}>

    {/* Go To */}
    <div>
      Go To{" "}
      <input
        type="number"
        min="1"
        max={totalPages}
        value={currentPage}
        onChange={(e) => {
          const page = Number(e.target.value);
          if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
          }
        }}
        style={styles.gotoInput}
      />
    </div>

    {/* PAGE BUTTONS */}
    <div style={styles.pageNumbers}>

      {/* Prev */}
      <button
        style={styles.pageBtn}
        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
      >
        ‹
      </button>

      {/* Numbers */}
      {[...Array(totalPages).keys()]
        .slice(Math.max(0, currentPage - 3), currentPage + 2)
        .map(i => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            style={{
              ...styles.pageNumber,
              backgroundColor: currentPage === i + 1 ? "#f97316" : "white",
              color: currentPage === i + 1 ? "white" : "black"
            }}
          >
            {i + 1}
          </button>
        ))}

      {/* Next */}
      <button
        style={styles.pageBtn}
        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
      >
        ›
      </button>

    </div>
  </div>

</div>

      {/* VIEW MODAL */}
      {selectedUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>

            <div style={styles.modalHeader}>
              <h3>User Details</h3>
              <button style={styles.closeBtnSmall} onClick={() => setSelectedUser(null)}>✖</button>
            </div>

            <div style={styles.scrollBox}>
              <table style={styles.detailTable}>
                <tbody>
                  {Object.entries(selectedUser).map(([key, value]) => {

                    const hidden = [
                      "geofences", "groups", "vendors",
                      "trakeyeType", "trakeyeTypeAttribute",
                      "trakeyeTypeAttributeValues", "vendor"
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
                              <details onClick={(e) => e.stopPropagation()}>
                                <summary>{value.slice(0, 2).join(", ")}</summary>
                                {value.map((g, i) => <div key={i}>{typeof g === "string" ? g : ""}</div>)}
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

      {/* EDIT MODAL */}
      {editUser && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalBox, width: "600px" }}>

            <div style={styles.modalHeader}>
              <h3>Edit User</h3>
              <button style={styles.closeBtnSmall} onClick={() => {
                setEditUser(null);
                // Restore district blocks or clear if no district selected
                if (selectedDistrict) {
                  axios.get(`https://user-extract.onrender.com/api/blocks/${selectedDistrict}`)
                    .then(res => {
                      const validBlocks = Array.isArray(res.data)
                        ? res.data.filter(isValidBlock)
                        : [];
                      setBlocks(validBlocks);
                      setSelectedBlocks(validBlocks.map(b => b.id));
                    })
                    .catch(() => {
                      setBlocks([]);
                      setSelectedBlocks([]);
                    });
                } else {
                  setBlocks([]);
                  setSelectedBlocks([]);
                }
              }}>✖</button>
            </div>

            <div style={styles.scrollBox}>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>First Name</label>
                <input
                  placeholder="First Name"
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  value={editUser?.firstName || ""}
                  onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Last Name</label>
                <input
                  placeholder="Last Name"
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  value={editUser?.lastName || ""}
                  onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Phone</label>
                <input
                  placeholder="Phone"
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  value={editUser?.phone || ""}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Email</label>
                <input
                  placeholder="Email"
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  value={editUser?.email || ""}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>GPS IMEI</label>
                <input
                  placeholder="GPS IMEI"
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  value={editUser?.gpsimei || ""}
                  onChange={(e) => setEditUser({ ...editUser, gpsimei: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Active Status</label>
                <select
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  value={editUser?.activated ? "active" : "inactive"}
                  onChange={(e) => setEditUser({ ...editUser, activated: e.target.value === "active" })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* BLOCKS */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
                  Blocks ({selectedBlocks?.length || 0} selected)
                </label>
                <div style={{ marginBottom: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Array.isArray(selectedBlocks) && selectedBlocks.length > 0 ? (
                    blocks
                      .filter(isValidBlock)
                      .filter(b => selectedBlocks.includes(b.id))
                      .map(b => (
                        <span key={`selected-block-${b.id}`} style={styles.chip}>{safeBlockName(b)}</span>
                      ))
                  ) : (
                    <span style={styles.chipEmpty}>No blocks selected</span>
                  )}
                </div>
                <input
                  placeholder="Search blocks"
                  style={{ ...styles.input, width: "100%", marginBottom: "10px" }}
                  value={editBlockSearch}
                  onChange={(e) => setEditBlockSearch(e.target.value)}
                />
                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #ccc", padding: "8px", borderRadius: "4px", backgroundColor: "#fafafa" }}>
                  {Array.isArray(blocks) && blocks.length > 0 ? (
  blocks
  .filter(isValidBlock)
  .filter(b =>
    b.name.toLowerCase().includes(editBlockSearch.toLowerCase())
  )
    .map(b => (
      <label key={b.id} style={{
        display: "block",
        marginBottom: "8px",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "3px",
        backgroundColor: selectedBlocks.includes(b.id)
          ? "#e3f2fd"
          : "transparent"
      }}>
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

        {/* ✅ HERE IS THE FIX */}
        {safeBlockName(b)} ({b.geofenceType || "UNKNOWN"})

      </label>
    ))
) : (
  <p style={{ color: "#999" }}>Loading blocks...</p>
)}
                </div>
              </div>

              {/* ROLES */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Roles</label>
                <div style={{ marginBottom: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Array.isArray(selectedRolesEdit) && selectedRolesEdit.length > 0 ? (
                    selectedRolesEdit.map((role, idx) => (
                      <span key={`selected-role-${role}-${idx}`} style={styles.chip}>{role}</span>
                    ))
                  ) : (
                    <span style={styles.chipEmpty}>No roles selected</span>
                  )}
                </div>
                <input
                  placeholder="Search roles"
                  style={{ ...styles.input, width: "100%", marginBottom: "10px" }}
                  value={editRoleSearch}
                  onChange={(e) => setEditRoleSearch(e.target.value)}
                />
                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", padding: "8px", borderRadius: "4px", backgroundColor: "#fafafa" }}>
                  {Array.isArray(rolesList) && rolesList.length > 0 ? (
                    rolesList
                      .filter(r => {
                        const roleName = (r.configKey || r.configValue || r.name || "").toString();
                        return roleName.toLowerCase().includes(editRoleSearch.toLowerCase());
                      })
                      .map((r, idx) => {
                        const roleId = r.id || r.configKey || idx;
                        const roleName = r.configKey || r.configValue || r.name || "";
                        const displayName = roleName || "(unnamed)";

                        return (
                          <label key={roleId} style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={Array.isArray(selectedRolesEdit) && selectedRolesEdit.includes(roleName)}
                              onChange={() => {
                                setSelectedRolesEdit(prev => {
                                  const safePrev = Array.isArray(prev) ? prev : [];
                                  return safePrev.includes(roleName)
                                    ? safePrev.filter(x => x !== roleName)
                                    : [...safePrev, roleName];
                                });
                              }}
                            />
                          {displayName}
                        </label>
                      );
                    })
                  ) : (
                    <p style={{ color: "#999" }}>Loading roles...</p>
                  )}
                </div>
              </div>

              {/* REPORTING */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Reporting To</label>
                <select
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  value={selectedReportingEdit?.id || ""}
                  onChange={(e) => {
                    const selected = Array.isArray(reportingListEdit)
                      ? reportingListEdit.find(r => r.id == e.target.value)
                      : null;
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
              <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "4px", fontSize: "12px", color: "#666" }}>
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

            <div style={{ marginTop: "10px" }}>
              <button style={styles.editBtn} onClick={handleUpdate}>Save</button>
              <button onClick={() => {
                setEditUser(null);
                // Restore district blocks or clear if no district selected
                if (selectedDistrict) {
                  axios.get(`https://user-extract.onrender.com/api/blocks/${selectedDistrict}`)
                    .then(res => {
                      const validBlocks = Array.isArray(res.data)
                        ? res.data.filter(isValidBlock)
                        : [];
                      setBlocks(validBlocks);
                      setSelectedBlocks(validBlocks.map(b => b.id));
                    })
                    .catch(() => {
                      setBlocks([]);
                      setSelectedBlocks([]);
                    });
                } else {
                  setBlocks([]);
                  setSelectedBlocks([]);
                }
              }}>Cancel</button>
            </div>

          </div>
        </div>
      )}
      {showHierarchy && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#f5f7fa",
    zIndex: 9999,
    overflow: "hidden"
  }}>
<div style={{
  padding: "10px 20px",
  borderBottom: "1px solid #ddd",
  background: "white",
  display: "flex",
  alignItems: "center",
  gap: "12px"
}}>

  <input
    type="text"
    placeholder="Search user in hierarchy..."
    value={hierarchySearch}

    onChange={(e) => {
      setHierarchySearch(e.target.value);
    }}

    onKeyDown={async (e) => {

      if (e.key !== "Enter") return;

      await searchHierarchyUser(hierarchySearch);

    }}

    style={{
      width: "300px",
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      outline: "none",
      fontSize: "14px"
    }}
  />

  {/* SEARCH LOADER */}
  {searchingHierarchy && (

    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      color: "#2563eb",
      fontWeight: "500"
    }}>

      <div style={{
        width: "18px",
        height: "18px",
        border: "3px solid #dbeafe",
        borderTop: "3px solid #2563eb",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }}></div>

      Searching hierarchy...

    </div>

  )}

</div>
    {/* HEADER */}
    <div style={{
      height: "60px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 20px",
      background: "white",
      boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
    }}>
      <h3>User Hierarchy</h3>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))}>➕</button>
        <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}>➖</button>
        <button onClick={() => setShowHierarchy(false)}>❌ Close</button>
      </div>
    </div>

    {/* CANVAS AREA */}
    <div
  onWheel={handleWheel}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}

  style={{
    width: "100%",
    height: "calc(100% - 60px)",
    overflow: "hidden",
    cursor: isPanning ? "grabbing" : "grab",
    background: "#f5f7fa",
    position: "relative"
  }}
>

  <div
    style={{
      transform: `
        translate(${position.x}px, ${position.y}px)
        scale(${zoom})
      `,
      transformOrigin: "top left",
      transition: isPanning
        ? "none"
        : "transform 0.1s ease",
      minWidth: "max-content",
      minHeight: "max-content",
      padding: "50px"
    }}
  >

    <DndProvider backend={HTML5Backend}>

      <Tree
        key={hierarchyKey}
        lineWidth={"2px"}
        lineColor={"#ccc"}
        lineBorderRadius={"10px"}
        label={<div></div>}
      >
        {hierarchyData.map(node => renderOrgTree(node))}
      </Tree>

    </DndProvider>

  </div>

</div>
</div>
)}
{hierarchyEditUser && (
 <div style={cleanStyles.modalOverlay}>
  <div style={cleanStyles.modalBox}>

    {/* HEADER */}
    <div style={cleanStyles.header}>
      <h3>Edit Reporting</h3>
    </div>

    {/* USER */}
    <div style={cleanStyles.userText}>
      <span>User:</span> {hierarchyEditUser.login}
    </div>

    {/* DROPDOWN */}
    <div style={cleanStyles.dropdownContainer}>

      {/* SELECT BOX */}
      <div
        style={cleanStyles.selectBox}
        onClick={() => setShowHierarchyDropdown(prev => !prev)}
      >
        {hierarchyReporting
          ? reportingListEdit.find(r => r.id == hierarchyReporting)?.login
          : "Select Reporting User"}
      </div>

      {/* DROPDOWN */}
      {showHierarchyDropdown && (
        <div style={cleanStyles.dropdown}>

          {/* SEARCH */}
          <input
            placeholder="Search reporting user..."
            value={hierarchyReportSearch}
            onChange={(e) => setHierarchyReportSearch(e.target.value)}
            style={cleanStyles.searchInput}
          />

          {/* LIST */}
          <div style={cleanStyles.list}>
            {reportingListEdit
              .filter(r =>
                r.login?.toLowerCase().includes(hierarchyReportSearch.toLowerCase())
              )
              .map(r => (
                <div
                  key={r.id}
                  style={{
                    ...cleanStyles.listItem,
                    background:
                      hierarchyReporting == r.id ? "#e0f2fe" : "white"
                  }}
                  onClick={() => {
                    setHierarchyReporting(r.id);
                    setShowHierarchyDropdown(false);
                    setHierarchyReportSearch("");
                  }}
                >
                  <b>{r.login}</b>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {r.firstName} {r.lastName}
                  </div>
                </div>
              ))}
          </div>

        </div>
      )}
    </div>

    {/* BUTTONS */}
    <div style={cleanStyles.actions}>
      <button style={cleanStyles.saveBtn} onClick={updateHierarchyReporting}>
        Save
      </button>

      <button style={cleanStyles.cancelBtn} onClick={() => setHierarchyEditUser(null)}>
        Cancel
      </button>
    </div>

  </div>

  </div>
)}
{loading && (
  <div style={styles.loaderOverlay}>
    <div style={styles.spinner}></div>
    <p style={{ color: "white", marginTop: "10px" }}>
      Loading...
    </p>
  </div>
)}
      
    </div>
  );

}


const styles = {
  page: { padding: "20px" },
  filters: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  alignItems: "center",
  marginTop: "10px"
},
loaderOverlay: {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 99999
},

spinner: {
  width: "50px",
  height: "50px",
  border: "5px solid #f3f3f3",
  borderTop: "5px solid #2563eb",
  borderRadius: "50%",
  animation: "spin 1s linear infinite"
},filterControl: {
  height: "38px",
  padding: "0 10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  width: "100%",
  background: "white",
  fontSize: "14px"
},
  input: { padding: "8px", width: "180px", marginBottom: "5px", border: "1px solid #ccc", borderRadius: "5px" },
  dropdownWrapper: { position: "relative", width: "200px" },
  dropdownBtn: { width: "100%", padding: "8px", border: "1px solid #ccc", cursor: "pointer", textAlign: "left" },
  dropdownMenu: {
    position: "absolute", top: "100%", left: 0, width: "100%",
    background: "white", border: "1px solid #ccc", padding: "10px",
    zIndex: 1000, boxShadow: "0 4px 8px rgba(0,0,0,0.1)", borderRadius: "6px"
  },
  dropdownList: { maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", padding: "5px" },
  dropdownItem: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "4px 2px", cursor: "pointer" },
  dropdownHeader: { display: "flex", marginBottom: "8px", gap: "6px" },
  dropdownActionBtn: { padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontSize: "12px", background: "#f5f5f5" },
  closeDropdownBtn: { marginTop: "5px" },
  downloadBtn: { background: "#2563eb", color: "white", padding: "8px" },
  chip: { display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: "999px", background: "#e0f2fe", color: "#0369a1", fontSize: "12px", border: "1px solid #bae6fd" },
  chipEmpty: { display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: "999px", background: "#f8fafc", color: "#6b7280", fontSize: "12px", border: "1px solid #e5e7eb" },
  loaderContainer: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "15px 0" },
  spinner: { width: "18px", height: "18px", border: "3px solid #ccc", borderTop: "3px solid blue", borderRadius: "50%" },
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.6)", display: "flex",
    justifyContent: "center", alignItems: "center", zIndex: 9999
  },
  paginationContainer: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "15px",
  padding: "10px",
  borderTop: "1px solid #ddd",
  fontSize: "14px"
},

paginationLeft: {
  display: "flex",
  gap: "20px",
  alignItems: "center"
},topBar: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px"
},

searchWrapper: {
  display: "flex",
  alignItems: "center",
  border: "1px solid #ccc",
  borderRadius: "20px",
  padding: "5px 10px",
  background: "white",
  width: "260px"
},
loaderContainer: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "30px",
  gap: "10px"
},

spinner: {
  width: "30px",
  height: "30px",
  border: "4px solid #ccc",
  borderTop: "4px solid #2563eb",
  borderRadius: "50%",
  animation: "spin 1s linear infinite"
},

searchIcon: {
  marginRight: "6px",
  fontSize: "14px",
  color: "#888"
},

searchInput: {
  border: "none",
  outline: "none",
  width: "100%",
  fontSize: "14px"
},

topActions: {
  display: "flex",
  gap: "10px"
},

primaryBtn: {
  background: "#f97316",   // orange (like polycab)
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "500"
},

secondaryBtn: {
  background: "#f97316",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "500"
},

paginationRight: {
  display: "flex",
  gap: "20px",
  alignItems: "center"
},

select: {
  padding: "4px",
  border: "1px solid #ccc",
  borderRadius: "4px"
},

gotoInput: {
  width: "50px",
  padding: "4px",
  border: "1px solid #ccc",
  borderRadius: "4px"
},

pageNumbers: {
  display: "flex",
  gap: "5px",
  alignItems: "center"
},

pageBtn: {
  padding: "5px 8px",
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer"
},

pageNumber: {
  padding: "5px 10px",
  border: "1px solid #ccc",
  cursor: "pointer"
},
  modalBox: {
    background: "white", width: "600px", maxHeight: "80vh",
    borderRadius: "10px", padding: "15px", display: "flex",
    flexDirection: "column", boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
  },
  filterPanel: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  padding: "15px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
},filterItem: {
  display: "flex",
  flexDirection: "column",
  gap: "4px"
},

filterLabel: {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "500"
},

filterControl: {
  height: "36px",
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  background: "#fff",
  width: "100%"
},
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", marginBottom: "10px" },
  scrollBox: { overflowY: "auto", maxHeight: "60vh" },
  detailTable: { width: "100%", borderCollapse: "collapse" },
  key: { fontWeight: "bold", width: "40%", padding: "8px", borderBottom: "1px solid #eee" },
  closeBtnSmall: { background: "red", color: "white", border: "none", padding: "4px 8px", fontSize: "12px", borderRadius: "5px", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px", fontSize: "14px" },
  th: { background: "#f3f4f6", padding: "12px", border: "1px solid #ddd", textAlign: "left", fontWeight: "600" },
  td: { padding: "10px", border: "1px solid #ddd", verticalAlign: "top" },
  tr: { cursor: "pointer", transition: "background 0.2s ease" },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px" },
  pageBtn: { padding: "6px 12px", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" },
  viewBtn: { padding: "5px", marginRight: "5px", background: "green", color: "white", border: "none", cursor: "pointer" },
  editBtn: { padding: "5px", background: "blue", color: "white", border: "none", cursor: "pointer" },
  geoBox: { maxHeight: "60px", overflowY: "auto", paddingRight: "5px" },hierarchyOverlay: {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999
},

hierarchyBox: {
  background: "white",
  width: "80%",
  maxHeight: "80vh",
  borderRadius: "10px",
  padding: "15px",
  overflow: "hidden"
},

hierarchyHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #eee",
  marginBottom: "10px"
},

nodeCard: {
  padding: "6px 10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  background: "#f9fafb",
  display: "inline-block"
},
hierarchyOverlay: {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999
},

hierarchyBox: {
  background: "white",
  width: "80%",
  maxHeight: "80vh",
  borderRadius: "10px",
  padding: "15px",
  overflow: "hidden"
},

hierarchyHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #eee",
  marginBottom: "10px"
},

nodeCard: {
  padding: "6px 10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  background: "#f9fafb",
  display: "inline-block"
},

loaderContainer: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "30px",
  gap: "10px"
},

spinner: {
  width: "30px",
  height: "30px",
  border: "4px solid #ccc",
  borderTop: "4px solid #2563eb",
  borderRadius: "50%",
  animation: "spin 1s linear infinite"
}
};

export default UsersTable;
