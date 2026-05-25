import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Tree from "react-d3-tree";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FaEye, FaEdit } from "react-icons/fa";

// ─── constants ───────────────────────────────────────────────
const BASE = "https://user-extract.onrender.com/api";
const PAGE_SIZES = [10, 20, 50, 100];

// ─── helpers ─────────────────────────────────────────────────
const isValidBlock = (b) =>
  b && b.id !== undefined && b.name !== undefined &&
  typeof b.name === "string" && b.name.trim() !== "";

const api = axios.create({ baseURL: BASE });

// ─── debounce hook ────────────────────────────────────────────
function useDebounce(value, ms = 500) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return deb;
}

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = ({ size = 24, inline = false }) => (
  <span style={{
    display: inline ? "inline-block" : "block",
    width: size, height: size,
    border: `3px solid #e5e7eb`,
    borderTop: `3px solid #2563eb`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  }} />
);

// ─── Build API params from current filter state ───────────────
// This is the single source of truth for all filter params.
// Used by: fetch users, export, hierarchy search.
function buildParams(filters, page = 0, size = 10) {
  const p = new URLSearchParams();

  p.append("page", page);
  p.append("size", size);
  p.append("sort", "last_modified_date,desc");

  if (filters?.search?.trim()) {
    p.append("search", filters.search.trim());
  }

  if (filters?.reportingTo) {
    p.append("reportingTo", filters.reportingTo);
  }

  if (filters?.roles?.length) {
    filters.roles.forEach(role=>{
      p.append("roles",role)
    });
  }

  if (filters?.blocks?.length) {
    filters.blocks.forEach(block=>{
      p.append("blocks",block)
    });
  }

 if(
   filters?.status !== "" &&
   filters?.status !== undefined &&
   filters?.status !== null
){
   p.append(
      "activated",
      filters.status
   );
}

  return p.toString();
}

// ─── UserRow ──────────────────────────────────────────────────
const UserRow = React.memo(({ u, isSelected, onToggleSelected, onView, onEdit }) => (
  <tr style={{ background: isSelected ? "#eff6ff" : "white" }}>
    <td style={S.td}>
      <input type="checkbox" checked={isSelected}
        onChange={(e) => onToggleSelected(u.login, e.target.checked)} />
    </td>
    <td style={S.td}>{u.login}</td>
    <td style={S.td}>{u.name}</td>
    <td style={S.td}>{u.phone}</td>
    <td style={{ ...S.td, color: u.activated ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
      {u.activated ? "Active" : "Inactive"}
    </td>
    <td style={S.td}>{u.roles?.join(", ")}</td>
    <td style={S.td}>
 {(u.version &&
   u.version !== "null")
   ? u.version
   : "—"}
</td>
    <td style={S.td}>{u.reportingTo || "—"}</td>
    <td style={S.td}>
      <div style={{ maxHeight: 55, overflowY: "auto" }}>
        {u.geofenceNames?.map((g, i) => typeof g === "string" ? <div key={i}>{g}</div> : null)}
      </div>
    </td>
    <td style={S.td}>
      <button onClick={() => onView(u)} title="View" style={S.viewBtn}><FaEye /></button>
      <button onClick={() => onEdit(u)} title="Edit" style={S.editBtn}><FaEdit /></button>
    </td>
  </tr>
));

// ─── Pagination ───────────────────────────────────────────────
const Pagination = React.memo(({ page, size, total, onPage, onSize }) => {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, total);

  const nums = useMemo(() => {
    const s = Math.max(0, Math.min(page - 2, totalPages - 5));
    const e = Math.min(totalPages, s + 5);
    return Array.from({ length: e - s }, (_, i) => s + i);
  }, [page, totalPages]);

  return (
    <div style={S.paginationBar}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
        </span>
        <select value={size} onChange={(e) => onSize(Number(e.target.value))} style={S.smallSelect}>
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button style={S.pageBtn} disabled={page === 0} onClick={() => onPage(0)}>«</button>
        <button style={S.pageBtn} disabled={page === 0} onClick={() => onPage(page - 1)}>‹</button>
        {nums.map((i) => (
          <button key={i} onClick={() => onPage(i)}
            style={{ ...S.pageBtn, background: page === i ? "#2563eb" : "white", color: page === i ? "white" : "#374151" }}>
            {i + 1}
          </button>
        ))}
        <button style={S.pageBtn} disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>›</button>
        <button style={S.pageBtn} disabled={page >= totalPages - 1} onClick={() => onPage(totalPages - 1)}>»</button>
      </div>
    </div>
  );
});

// ─── SearchDropdown ───────────────────────────────────────────
const SearchDropdown = React.memo(({ label, value, options, onSelect, onClear, labelKey = "login", valueKey = "id" }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => options.filter((o) => (o[labelKey] || "").toLowerCase().includes(q.toLowerCase())), [options, q, labelKey]);
  const selected = options.find((o) => o[valueKey] == value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((p) => !p)} style={{ ...S.dropBtn, background: value ? "#eff6ff" : "white" }}>
        {selected ? selected[labelKey] : label}
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div style={S.dropMenu}>
          <input autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={S.dropSearch} />
          <div style={S.dropList}>
            <div style={{ ...S.dropItem, color: "#2563eb", fontWeight: 600 }}
              onClick={() => { onClear(); setOpen(false); setQ(""); }}>All</div>
            {filtered.map((o) => (
              <div key={o[valueKey]}
                style={{ ...S.dropItem, background: value == o[valueKey] ? "#eff6ff" : "white" }}
                onClick={() => { onSelect(o[valueKey]); setOpen(false); setQ(""); }}>
                {o[labelKey]}
                {o.firstName && <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>({o.firstName} {o.lastName})</span>}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: "8px 10px", color: "#9ca3af", fontSize: 13 }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── MultiCheckDropdown ───────────────────────────────────────
const MultiCheckDropdown = React.memo(({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())), [options, q]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((p) => !p)} style={{ ...S.dropBtn, background: selected.length ? "#eff6ff" : "white" }}>
        {label} {selected.length > 0 && `(${selected.length})`}
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div style={{ ...S.dropMenu, minWidth: 220 }}>
          <div style={{ display: "flex", gap: 4, padding: "6px 8px" }}>
            <button style={S.miniBtn} onClick={() => onChange(options)}>All</button>
            <button style={S.miniBtn} onClick={() => onChange([])}>None</button>
            <button style={{ ...S.miniBtn, marginLeft: "auto" }} onClick={() => setOpen(false)}>Done</button>
          </div>
          <input autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={S.dropSearch} />
          <div style={S.dropList}>
            {filtered.map((r) => (
              <label key={r} style={{ ...S.dropItem, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={selected.includes(r)}
                  onChange={() => onChange(selected.includes(r) ? selected.filter((x) => x !== r) : [...selected, r])} />
                {r}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── ViewModal ────────────────────────────────────────────────
const ViewModal = React.memo(({ user, onClose }) => {
  if (!user) return null;
  const HIDDEN = new Set(["geofences", "groups", "vendors", "trakeyeType", "trakeyeTypeAttribute", "trakeyeTypeAttributeValues", "vendor"]);
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 560 }}>
        <div style={S.modalHead}>
          <h3 style={{ margin: 0 }}>User Details</h3>
          <button style={S.closeBtn} onClick={onClose}>✖</button>
        </div>
        <div style={S.scrollBox}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(user).map(([k, v]) => {
                if (HIDDEN.has(k)) return null;
                let display;
                if (k === "activated") display = <span style={{ color: v ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{v ? "Active" : "Inactive"}</span>;
                else if (k === "authorities") display = v?.map((r, i) => <div key={i}>{r}</div>);
                else if (k === "ownedBy") display = v?.map((x) => x.login).join(", ");
                else if (k === "geofenceNames") display = v?.join(", ");
                else display = Array.isArray(v) ? v.join(", ") : String(v ?? "");
                return (
                  <tr key={k}>
                    <td style={S.detailKey}>{k}</td>
                    <td style={S.td}>{display}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

// ─── EditModal ────────────────────────────────────────────────
const EditModal = React.memo(({ editUser, setEditUser, blocks, rolesList, reportingList, selectedBlocks, setSelectedBlocks, selectedRoles, setSelectedRoles, selectedReporting, setSelectedReporting, onSave, onCancel }) => {
  const [blockQ, setBlockQ] = useState("");
  const [roleQ, setRoleQ] = useState("");

  const filteredBlocks = useMemo(() => blocks.filter((b) => isValidBlock(b) && b.name.toLowerCase().includes(blockQ.toLowerCase())), [blocks, blockQ]);
  const filteredRoles = useMemo(() => rolesList.filter((r) => (r.configKey || r.configValue || r.name || "").toLowerCase().includes(roleQ.toLowerCase())), [rolesList, roleQ]);

  if (!editUser) return null;
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 620 }}>
        <div style={S.modalHead}>
          <h3 style={{ margin: 0 }}>Edit — {editUser.login}</h3>
          <button style={S.closeBtn} onClick={onCancel}>✖</button>
        </div>
        <div style={S.scrollBox}>
          {[["First Name", "firstName"], ["Last Name", "lastName"], ["Phone", "phone"], ["Email", "email"], ["GPS IMEI", "gpsimei"]].map(([label, field]) => (
            <div key={field} style={S.formRow}>
              <label style={S.formLabel}>{label}</label>
              <input style={S.formInput} value={editUser[field] || ""}
                onChange={(e) => setEditUser((u) => ({ ...u, [field]: e.target.value }))} />
            </div>
          ))}
          <div style={S.formRow}>
            <label style={S.formLabel}>Status</label>
            <select style={S.formInput} value={editUser.activated ? "active" : "inactive"}
              onChange={(e) => setEditUser((u) => ({ ...u, activated: e.target.value === "active" }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div style={S.formRow}>
            <label style={S.formLabel}>Reporting To</label>
            <select style={S.formInput} value={selectedReporting?.id || ""}
              onChange={(e) => setSelectedReporting(reportingList.find((r) => r.id == e.target.value) || null)}>
              <option value="">Select manager</option>
              {reportingList.map((r) => (
                <option key={r.id} value={r.id}>{r.login} ({r.firstName} {r.lastName})</option>
              ))}
            </select>
          </div>
          <div style={S.formRow}>
            <label style={S.formLabel}>Roles ({selectedRoles.length})</label>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                {selectedRoles.map((r) => (
                  <span key={r} style={S.chip}>{r}
                    <span style={{ cursor: "pointer", marginLeft: 4 }} onClick={() => setSelectedRoles((p) => p.filter((x) => x !== r))}>×</span>
                  </span>
                ))}
              </div>
              <input placeholder="Search roles…" value={roleQ} onChange={(e) => setRoleQ(e.target.value)} style={{ ...S.formInput, marginBottom: 4 }} />
              <div style={{ maxHeight: 130, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 4, padding: 4 }}>
                {filteredRoles.map((r, i) => {
                  const name = r.configKey || r.configValue || r.name || "";
                  return (
                    <label key={r.id || i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={selectedRoles.includes(name)}
                        onChange={() => setSelectedRoles((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])} />
                      {name || "(unnamed)"}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={S.formRow}>
            <label style={S.formLabel}>Blocks ({selectedBlocks.length})</label>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                {blocks.filter((b) => isValidBlock(b) && selectedBlocks.includes(b.id)).map((b) => (
                  <span key={b.id} style={S.chip}>{b.name}
                    <span style={{ cursor: "pointer", marginLeft: 4 }} onClick={() => setSelectedBlocks((p) => p.filter((id) => id !== b.id))}>×</span>
                  </span>
                ))}
              </div>
              <input placeholder="Search blocks…" value={blockQ} onChange={(e) => setBlockQ(e.target.value)} style={{ ...S.formInput, marginBottom: 4 }} />
              <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 4, padding: 4 }}>
                {filteredBlocks.map((b) => (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px", cursor: "pointer", fontSize: 13, background: selectedBlocks.includes(b.id) ? "#eff6ff" : "transparent", borderRadius: 3 }}>
                    <input type="checkbox" checked={selectedBlocks.includes(b.id)}
                      onChange={() => setSelectedBlocks((p) => p.includes(b.id) ? p.filter((id) => id !== b.id) : [...p, b.id])} />
                    {b.name} <span style={{ color: "#9ca3af", fontSize: 11 }}>({b.geofenceType})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 12 }}>
          <button style={S.saveBtnLarge} onClick={onSave}>Save Changes</button>
          <button style={S.cancelBtnLarge} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
});

// ─── HierarchyEditModal ───────────────────────────────────────
const HierarchyEditModal = React.memo(({ user, reportingList, onSave, onCancel }) => {
  const [selectedId, setSelectedId] = useState("");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => reportingList.filter((r) => r.login?.toLowerCase().includes(q.toLowerCase())), [reportingList, q]);
  if (!user) return null;
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 420 }}>
        <div style={S.modalHead}>
          <h3 style={{ margin: 0 }}>Edit Reporting</h3>
          <button style={S.closeBtn} onClick={onCancel}>✖</button>
        </div>
        <p style={{ margin: "0 0 12px", color: "#374151" }}>User: <strong>{user.login}</strong></p>
        <input autoFocus placeholder="Search manager…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...S.formInput, marginBottom: 6 }} />
        <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          {filtered.map((r) => (
            <div key={r.id} onClick={() => setSelectedId(r.id)}
              style={{ padding: "10px 12px", cursor: "pointer", background: selectedId == r.id ? "#eff6ff" : "white", borderBottom: "1px solid #f3f4f6" }}>
              <strong>{r.login}</strong>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{r.firstName} {r.lastName}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button style={S.saveBtnLarge} onClick={() => onSave(selectedId)}>Save</button>
          <button style={S.cancelBtnLarge} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
});

// ─── BulkPanel ────────────────────────────────────────────────
const BulkPanel = React.memo(({ selectedLogins, reportingList, onUpdate, onClearAll, onRemoveOne }) => {
  const [selectedId, setSelectedId] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  if (selectedLogins.length === 0) return null;

  const filtered = reportingList.filter((r) => r.login?.toLowerCase().includes(q.toLowerCase()));
  const chosen = reportingList.find((r) => r.id == selectedId);

  return (
    <div style={S.bulkPanel}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {selectedLogins.map((l) => (
          <span key={l} style={S.chip}>{l}
            <span style={{ cursor: "pointer", marginLeft: 4 }} onClick={() => onRemoveOne(l)}>×</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <button style={{ ...S.dropBtn, minWidth: 200 }} onClick={() => setOpen((p) => !p)}>
            {chosen ? chosen.login : "Select reporting manager"}
            <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>▼</span>
          </button>
          {open && (
            <div style={{ ...S.dropMenu, minWidth: 240, zIndex: 2000 }}>
              <input autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={S.dropSearch} />
              <div style={S.dropList}>
                {filtered.map((r) => (
                  <div key={r.id} style={{ ...S.dropItem, background: selectedId == r.id ? "#eff6ff" : "white" }}
                    onClick={() => { setSelectedId(r.id); setOpen(false); setQ(""); }}>
                    {r.login} <span style={{ fontSize: 11, color: "#6b7280" }}>({r.firstName} {r.lastName})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button style={S.saveBtnLarge} onClick={() => onUpdate(selectedId)}>Update Reporting</button>
        <button style={{ ...S.cancelBtnLarge, background: "#fee2e2", color: "#dc2626" }} onClick={onClearAll}>Remove All</button>
      </div>
    </div>
  );
});

// ─── find node helper ─────────────────────────────────────────
function findNodeByLogin(nodes, login) {
  for (const n of nodes) {
    if (n.login === login) return n;
    if (n.children?.length) {
      const f = findNodeByLogin(n.children, login);
      if (f) return f;
    }
  }
  return null;
}

function convertToD3(nodes) {
  if (!nodes?.length) return null;
  const build = (n) => ({
    id: n.id, login: n.login, name: n.login,
    attributes: { fullName: `${n.firstName || ""} ${n.lastName || ""}`.trim() },
    hasChildren: n.hasChildren,
    children: n.children?.length ? n.children.map(build) : [],
  });
  return build(nodes[0]);
}

// ─── HierarchyD3Node ──────────────────────────────────────────
const HierarchyD3Node = React.memo(({ nodeDatum, toggleNode, hierarchyData, loadChildren, reloadAllData, setLoading, openHierarchyEdit, highlightedUser, reportingListEdit, setReportingListEdit }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "USER",
    item: { login: nodeDatum.name, id: nodeDatum.id },
    collect: (m) => ({ isDragging: !!m.isDragging() }),
  }));
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "USER",
    collect: (m) => ({ isOver: !!m.isOver() }),
    drop: async (draggedItem) => {
      if (draggedItem.login === nodeDatum.name) return;
      try {
        setLoading(true);
        const { data: user } = await api.get(`/user/${draggedItem.login}`);
        const target = findNodeByLogin(hierarchyData, nodeDatum.name);
        if (!target) return alert("Target not found");
        await api.put("/edit-user", { ...user, geofences: user.geofences?.map((g) => g.id || g) || [], reportingTo: target.id });
        alert("Hierarchy updated ✅");
        await reloadAllData();
      } catch { alert("Update failed ❌"); }
      finally { setLoading(false); }
    },
  }));

  const bg = highlightedUser === nodeDatum.name ? "#f59e0b" : isOver ? "#fbbf24" : nodeDatum.hasChildren ? "#16a34a" : "#2563eb";

  return (
    <foreignObject width="220" height="110" x="-110" y="-45" style={{ pointerEvents: "auto" }}>
      <div ref={(n) => { drag(drop(n)); }}
        style={{ background: bg, padding: "10px 12px", borderRadius: 8, color: "white", cursor: isDragging ? "grabbing" : "grab", opacity: isDragging ? 0.5 : 1, boxShadow: "0 3px 8px rgba(0,0,0,.25)", userSelect: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
        onClick={async (e) => {
          e.stopPropagation();
          if (nodeDatum.hasChildren && (!nodeDatum.children || nodeDatum.children.length === 0)) {
            await loadChildren(nodeDatum.name);
          }
          toggleNode?.();
        }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{nodeDatum.name}</div>
        {nodeDatum.attributes?.fullName && <div style={{ fontSize: 11, opacity: 0.85 }}>{nodeDatum.attributes.fullName}</div>}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const { data: user } = await api.get(`/user/${nodeDatum.name}`);
              if (reportingListEdit.length === 0) {
                const { data } = await api.get("/reporting-users");
                setReportingListEdit(data || []);
              }
              openHierarchyEdit(user);
            } catch { alert("Failed to load user ❌"); }
          }}
          style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)", color: "white", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          ✎ Edit Reporting
        </button>
      </div>
    </foreignObject>
  );
});

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function UsersTable() {
  // ── pagination ──
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // ── filter state (all in one object for easy param building) ──
  const [searchInput, setSearchInput] = useState("");
  const [filterReportingTo, setFilterReportingTo] = useState("");
  const [filterRoles, setFilterRoles] = useState([]);
  const [filterStatus, setFilterStatus] = useState(""); // "", "true", "false"
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterBlocks, setFilterBlocks] = useState([]);

  // ── server data ──
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [districts, setDistricts] = useState([]);
  const [districtBlocks, setDistrictBlocks] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [reportingList, setReportingList] = useState([]);

  // ── UI flags ──
  const [loading, setLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // ── pending filter state (not yet applied) ──
  const [pendingReportingTo, setPendingReportingTo] = useState("");
  const [pendingRoles, setPendingRoles] = useState([]);
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingDistrict, setPendingDistrict] = useState("");
  const [pendingBlocks, setPendingBlocks] = useState([]);

  // ── modals ──
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editSelectedBlocks, setEditSelectedBlocks] = useState([]);
  const [editSelectedRoles, setEditSelectedRoles] = useState([]);
  const [editSelectedReporting, setEditSelectedReporting] = useState(null);
  const [editBlocks, setEditBlocks] = useState([]);
  const [editRolesList, setEditRolesList] = useState([]);

  // ── bulk ──
  const [selectedUsers, setSelectedUsers] = useState([]);

  // ── hierarchy ──
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [highlightedUser, setHighlightedUser] = useState("");
  const [hierarchySearch, setHierarchySearch] = useState("");
  const [searchingHierarchy, setSearchingHierarchy] = useState(false);
  const [hierarchyEditUser, setHierarchyEditUser] = useState(null);
  const [hierarchyKey, setHierarchyKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const loadedHierarchyNodes = useRef(new Set());
  const abortRef = useRef(null);
  const fetchAbortRef = useRef(null);

  // Debounce only the search input
  const debouncedSearch = useDebounce(searchInput, 500);
const appliedFilters = useMemo(() => ({
   search: debouncedSearch,
   reportingTo: filterReportingTo,
   roles: filterRoles,
   blocks: filterBlocks,
   status: filterStatus
}),[
   debouncedSearch,
   filterReportingTo,
   filterRoles,
   filterBlocks,
   filterStatus
])
  // ── reset page when search or applied filters change ──
  useEffect(() => { setPage(0); }, [debouncedSearch, filterReportingTo, filterRoles, filterStatus, filterBlocks]);

  // ── CORE: fetch only the current page from server ──
  useEffect(()=>{

fetchAbortRef.current?.abort();

const controller=new AbortController();

fetchAbortRef.current=controller;

const fetchUsers=async()=>{

try{

setLoading(true);

const query=buildParams(
appliedFilters,
page,
size
)

const res=await api.get(
`/users-summary?${query}`,
{
signal:controller.signal
}
)

const response = res.data || {};

console.log("API RESPONSE:",response);

setUsers(
    Array.isArray(response.content)
        ? response.content.map(u => {
            console.log("User data:", u);
            return u;
          })
        : []
)

setTotalUsers(
    response.totalElements || 0
)
}
catch(err){

if(
err.name!=="CanceledError" &&
err.code!=="ERR_CANCELED"
){

console.log(err)

}

}
finally{

if(!controller.signal.aborted){

setLoading(false)

}

}

}

fetchUsers();

return()=>{

controller.abort()

}

},[
page,
size,
appliedFilters
])

  // ── fetch reference data once ──
  useEffect(() => {
    api.get("/districts").then(({ data }) => setDistricts(data || []));
    api.get("/reporting-users").then(({ data }) => setReportingList(Array.isArray(data) ? data : []));
    api.get("/roles").then(({ data }) => {
      const roles = Array.isArray(data) ? data : [];
      setRolesList(roles);
      setEditRolesList(roles);
    });
  }, []);

  // ── fetch blocks when district selected (in filter panel) ──
  useEffect(() => {

if (!pendingDistrict) {

setDistrictBlocks([]);
setPendingBlocks([]);

return;

}

setBlocksLoading(true);

api.get(`/blocks/${pendingDistrict}`)

.then(({data})=>{

const v=
(data||[])
.filter(isValidBlock);

setDistrictBlocks(v);

setPendingBlocks([]);

})

.catch(()=>{

setDistrictBlocks([]);
setPendingBlocks([]);

})

.finally(()=>{

setBlocksLoading(false);

});

},[pendingDistrict]);

  // ── Apply filters ──
  const applyFilters = useCallback(() => {
    setFilterReportingTo(pendingReportingTo);
    setFilterRoles(pendingRoles);
    setFilterStatus(pendingStatus);
    setFilterDistrict(pendingDistrict);
    setFilterBlocks(pendingBlocks);
    setFiltersApplied(
      !!(pendingReportingTo || pendingRoles.length || pendingStatus || pendingDistrict || pendingBlocks.length)
    );
    setPage(0);
  }, [pendingReportingTo, pendingRoles, pendingStatus, pendingDistrict, pendingBlocks]);

  // ── Clear all filters ──
  const clearAllFilters = useCallback(() => {
    setPendingReportingTo(""); setPendingRoles([]); setPendingStatus("");
    setPendingDistrict(""); setPendingBlocks([]);
    setFilterReportingTo(""); setFilterRoles([]); setFilterStatus("");
    setFilterDistrict(""); setFilterBlocks([]);
    setFiltersApplied(false);
    setPage(0);
  }, []);

  // ── reload ──
 const reloadAllData=async()=>{

try{

setLoading(true)

const q=buildParams(
appliedFilters,
page,
size
)

const [usersRes,hierarchyRes]=
await Promise.all([

api.get(
`/users-summary?${q}`
),

api.get(
"/hierarchy/root"
)

])

setUsers(
Array.isArray(
usersRes.data?.content
)
?usersRes.data.content
:[]
)

setTotalUsers(
Number(
usersRes.data?.totalElements
)||0
)

setHierarchyData(
Array.isArray(hierarchyRes.data)
?hierarchyRes.data
:[hierarchyRes.data]
)

}
catch(e){

console.log(e)

}
finally{

setLoading(false)

}

}
const handleView = useCallback(async (u) => {
  try {
    setLoading(true);

    const { data } = await api.get(`/user/${u.login}`);

    setSelectedUser(data);

  } catch (e) {

    console.log(e);
    alert("Failed to load user ❌");

  } finally {

    setLoading(false);

  }
}, []);
  // ── edit modal ──
  const handleOpenEdit = useCallback(async (u) => {
    setLoading(true);
    try {
      const [userRes, geoRes, rolesRes] = await Promise.all([
        api.get(`/user/${u.login}`),
        api.get("/geofences"),
        api.get("/roles"),
      ]);
      const full = userRes.data;
      setEditUser({
        id: full.id, login: full.login, firstName: full.firstName || "",
        lastName: full.lastName || "", email: full.email || "", phone: full.phone || "",
        gpsimei: full.gpsimei || "", activated: full.activated ?? true,
        authorities: full.authorities || [], geofences: full.geofences || [],
        ownedBy: full.ownedBy || [], langKey: full.langKey || "en",
      });
      setEditSelectedRoles(full.authorities || []);
      setEditSelectedReporting(full.ownedBy?.[0] ? reportingList.find((r) => r.id === full.ownedBy[0].id) || null : null);
      const geoIds = (full.geofences || []).map((g) => (typeof g === "object" ? g.id : g));
      setEditSelectedBlocks(geoIds);
      const allGeo = [
        ...(Array.isArray(geoRes.data?.masters) ? geoRes.data.masters : []),
        ...(Array.isArray(geoRes.data?.minis) ? geoRes.data.minis : []),
      ].filter(isValidBlock);
      setEditBlocks(allGeo);
      setEditRolesList(Array.isArray(rolesRes.data) ? rolesRes.data : []);
    } catch { alert("Failed to load user ❌"); }
    finally { setLoading(false); }
  }, [reportingList]);

  const handleSave = useCallback(async () => {
    if (!editUser) return;
    const payload = {
      id: editUser.id, login: editUser.login,
      firstName: editUser.firstName, lastName: editUser.lastName,
      email: editUser.email, phone: editUser.phone,
      gpsimei: editUser.gpsimei, activated: editUser.activated,
      langKey: editUser.langKey,
      authorities: editSelectedRoles.map((r) => typeof r === "string" ? r : r?.configValue || ""),
      geofences: editSelectedBlocks,
      reportingTo: editSelectedReporting?.id || null,
    };
    try {
      await api.put("/edit-user", payload);
      setEditUser(null); setEditBlocks([]); setEditSelectedBlocks([]);
      await reloadAllData();
      alert("Updated ✅");
    } catch (e) { console.error(e.response?.data); alert("Update failed ❌"); }
  }, [editUser, editSelectedRoles, editSelectedBlocks, editSelectedReporting, reloadAllData]);

  const handleCancelEdit = useCallback(() => {
    setEditUser(null); setEditBlocks([]); setEditSelectedBlocks([]);
  }, []);

  // ── bulk update ──
  const handleBulkUpdate = useCallback(async (reportingId) => {
    if (!reportingId) { alert("Select a reporting manager ❌"); return; }
    if (selectedUsers.length === 0) { alert("Select users ❌"); return; }
    try {
      await api.put("/bulk-update-reporting", { logins: selectedUsers, reportingTo: Number(reportingId) });
      setSelectedUsers([]);
      await reloadAllData();
      alert("Bulk update done ✅");
    } catch { alert("Bulk update failed ❌"); }
  }, [selectedUsers, reloadAllData]);

  const allPageSelected = users.length > 0 && users.every((u) => selectedUsers.includes(u.login));
  const handleToggleAll = useCallback((checked) => {
    const logins = users.map((u) => u.login);
    setSelectedUsers((prev) => checked ? [...new Set([...prev, ...logins])] : prev.filter((l) => !logins.includes(l)));
  }, [users]);
  const handleToggleOne = useCallback((login, checked) => {
    setSelectedUsers((prev) => checked ? [...prev, login] : prev.filter((l) => l !== login));
  }, []);

  // ── EXPORT: uses current APPLIED filters, fetches all matching rows ──
  
      // Build filename to reflect active filters
      const downloadFiltered=async()=>{

try{

setDownloading(true)

const q=buildParams(
appliedFilters,
0,
totalUsers
)

const res=await api.get(
`/users-summary?${q}`
)

const allData=
res.data.content || []

const excel=allData.map(u=>({

Login:u.login,

Name:u.name,

Phone:u.phone,

Status:
u.activated
?"Active"
:"Inactive",

Roles:
u.roles?.join(","),

Reporting:
u.reportingTo,

Version:
(u.version &&
 u.version !== "null")
? u.version
: ""

}))

const ws=
XLSX.utils.json_to_sheet(excel)

const wb=
XLSX.utils.book_new()

XLSX.utils.book_append_sheet(
wb,
ws,
"Users"
)

XLSX.writeFile(
wb,
"users.xlsx"
)

}
catch(e){

console.log(e)

}
finally{

setDownloading(false)

}

}

  // ── hierarchy ──
  const loadChildren = useCallback(async (login) => {
    if (loadedHierarchyNodes.current.has(login)) return;
    loadedHierarchyNodes.current.add(login);
    try {
      const { data } = await api.get(`/hierarchy/children/${login}`);
      const children = (Array.isArray(data) ? data : []).map((c) => ({ ...c, children: c.children || [] }));
      setHierarchyData((prev) => {
        const update = (nodes) => nodes.map((n) =>
          n.login === login ? { ...n, children } : n.children ? { ...n, children: update(n.children) } : n
        );
        return [...update(prev)];
      });
      setHierarchyKey((k) => k + 1);
    } catch (e) { if (e.name !== "AbortError") console.error(e); }
  }, []);

  const openHierarchyEdit = useCallback((user) => setHierarchyEditUser(user), []);

  const handleHierarchyEditSave = useCallback(async (reportingId) => {
    if (!hierarchyEditUser || !reportingId) return;
    try {
      const { data: user } = await api.get(`/user/${hierarchyEditUser.login}`);
      await api.put("/edit-user", { ...user, geofences: (user.geofences || []).map((g) => g.id || g), reportingTo: Number(reportingId) });
      setHierarchyEditUser(null);
      await reloadAllData();
      alert("Updated ✅");
    } catch { alert("Update failed ❌"); }
  }, [hierarchyEditUser, reloadAllData]);

  // ── helper: find path in hierarchy and expand ──
  const expandPathToUser = useCallback(async(userLogin)=>{

try{

// clear previous loaded nodes
loadedHierarchyNodes.current.clear();

// reload root only
const rootRes=await api.get("/hierarchy/root");

const roots=
Array.isArray(rootRes.data)
? rootRes.data
:[rootRes.data];

setHierarchyData(roots);

// queue for BFS
let queue=[...roots];

while(queue.length){

const current=queue.shift();

if(current.login===userLogin){

setHighlightedUser(userLogin);

setHierarchyKey(k=>k+1);

return;
}

if(current.hasChildren){

const res=await api.get(
`/hierarchy/children/${current.login}`
);

const children=
Array.isArray(res.data)
?res.data
:[];

current.children=children;

loadedHierarchyNodes.current.add(
current.login
);

queue.push(...children);
}

}

setHighlightedUser("");

}
catch(e){

console.log(e);

}
},[]);

  // ── hierarchy search ──
  const debouncedHierarchySearch = useDebounce(hierarchySearch, 500);
  useEffect(()=>{

if(
!debouncedHierarchySearch ||
!showHierarchy
){

setHighlightedUser("")
return

}

setSearchingHierarchy(true)

const searchHierarchy=async()=>{

try{

const q=buildParams(
{
search:debouncedHierarchySearch
},
0,
1000
)

const res=await api.get(
`/users-summary?${q}`
)

const users=
res.data?.content || []

if(users.length){

const foundLogin = users[0].login
setHighlightedUser(foundLogin)
await expandPathToUser(foundLogin)

}else{

setHighlightedUser("")

}

}
catch{

setHighlightedUser("")

}
finally{

setSearchingHierarchy(false)

}

}

searchHierarchy()

},[
debouncedHierarchySearch,
showHierarchy,
expandPathToUser
])

  const openHierarchy = useCallback(async () => {
    abortRef.current = new AbortController();
    loadedHierarchyNodes.current.clear();
    setShowHierarchy(true);
    setHierarchyLoading(true);
    try {
      const { data } = await api.get("/hierarchy/root", { signal: abortRef.current.signal });
      setHierarchyData(Array.isArray(data) ? data : [data]);
    } catch (e) {
      if (e.name !== "AbortError") { setHierarchyData([]); alert("Hierarchy unavailable ❌"); }
    } finally { setHierarchyLoading(false); }
  }, []);

  const closeHierarchy = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setShowHierarchy(false);
    setHighlightedUser(""); setHierarchySearch("");
    setSearchingHierarchy(false); setHierarchyData([]);
    loadedHierarchyNodes.current.clear();
  }, []);

  // pan/zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(0.3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);
  const handleMouseDown = useCallback((e) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);
  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    setPosition({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);
  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Derive role options from fetched rolesList + page data
  const allRoles = useMemo(() => {
    const fromApi = rolesList.map((r) => r.configKey || r.configValue || r.name || "").filter(Boolean);
    const fromPage = new Set();
    users.forEach((u) => u.roles?.forEach((r) => fromPage.add(r)));
    return [...new Set([...fromApi, ...fromPage])].sort();
  }, [rolesList, users]);

  const reportingOptions = useMemo(() => reportingList.map((r) => ({ ...r, login: r.login || String(r.id) })), [reportingList]);

  // Active filter count badge
  const activeFilterCount = [filterReportingTo, filterStatus, filterDistrict].filter(Boolean).length + filterRoles.length + filterBlocks.length;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        tr:hover td { background: #f9fafb !important; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>User Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280" }}>
          {loading && <><Spinner size={14} inline /><span>Loading…</span></>}
          {!loading && <span><strong style={{ color: "#111827" }}>{totalUsers.toLocaleString()}</strong> total users</span>}
        </div>
      </div>

      {/* TOP BAR */}
      <div style={S.topBar}>
        <div style={S.searchBox}>
          <span style={{ color: "#9ca3af", fontSize: 14 }}>🔍</span>
          <input
            placeholder="Search by login, name, phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={S.searchInput}
          />
          {searchInput && <button onClick={() => setSearchInput("")} style={S.clearBtn}>✕</button>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.primaryBtn, position: "relative" }} onClick={() => setShowFilters((p) => !p)}>
            ☰ Filters
            {activeFilterCount > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", color: "white", borderRadius: 999, fontSize: 10, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, padding: "0 3px" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button style={S.primaryBtn} onClick={openHierarchy}>🌳 Hierarchy</button>
          <button style={{ ...S.primaryBtn, background: downloading ? "#9ca3af" : "#059669" }} onClick={downloadFiltered} disabled={downloading} title={filtersApplied ? "Export filtered results" : "Export all users"}>
            {downloading ? <><Spinner size={12} inline /> Exporting…</> : `⬇ Export${filtersApplied ? " (Filtered)" : ""}`}
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div style={S.filterPanel}>
          <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
            {/* Reporting To */}
        <SearchDropdown
label="Reporting To"
value={pendingReportingTo}
options={reportingOptions}
valueKey="login"
onSelect={setPendingReportingTo}
onClear={() => setPendingReportingTo("")}
/>

            {/* Status */}
            <select style={S.filterSelect} value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {/* Roles */}
            <MultiCheckDropdown label="Roles" options={allRoles} selected={pendingRoles} onChange={setPendingRoles} />

            {/* District */}
            <select style={S.filterSelect} value={pendingDistrict} onChange={(e) => setPendingDistrict(e.target.value)}>
              <option value="">All Districts</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            {/* Blocks (shows after district selected) */}
          {pendingDistrict && districtBlocks.length>0 && (

<MultiCheckDropdown

label="Blocks"

options={
districtBlocks.map(
b=>b.name
)
}

selected={
pendingBlocks
}

onChange={
setPendingBlocks
}

/>

)}

            {/* Apply / Clear buttons */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button style={{ ...S.saveBtnLarge, background: "#f97316" }} onClick={applyFilters}>Apply Filters</button>
              {filtersApplied && (
                <button style={S.cancelBtnLarge} onClick={clearAllFilters}>Clear All</button>
              )}
            </div>
          </div>

          {/* Active filter tags */}
          {filtersApplied && (
            <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 12, color: "#6b7280", alignSelf: "center" }}>Active filters:</span>
              {filterReportingTo && (
                <span style={S.filterChip}>
                  Reporting: {reportingOptions.find((r) => r.id == filterReportingTo)?.login || filterReportingTo}
                  <span onClick={() => { setFilterReportingTo(""); setPendingReportingTo(""); }} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
                </span>
              )}
              {filterStatus && (
                <span style={S.filterChip}>
                  Status: {filterStatus === "true" ? "Active" : "Inactive"}
                  <span onClick={() => { setFilterStatus(""); setPendingStatus(""); }} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
                </span>
              )}
              {filterRoles.map((r) => (
                <span key={r} style={S.filterChip}>
                  Role: {r}
                  <span onClick={() => { const nr = filterRoles.filter((x) => x !== r); setFilterRoles(nr); setPendingRoles(nr); }} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
                </span>
              ))}
              {filterDistrict && (
                <span style={S.filterChip}>
                  District: {districts.find((d) => d.id == filterDistrict)?.name || filterDistrict}
                  <span onClick={() => { setFilterDistrict(""); setPendingDistrict(""); setFilterBlocks([]); setPendingBlocks([]); }} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
                </span>
              )}
              {filterBlocks.length > 0 && (
                <span style={S.filterChip}>
                  Blocks: {filterBlocks.length} selected
                  <span onClick={() => { setFilterBlocks([]); setPendingBlocks([]); }} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* BULK PANEL */}
      <BulkPanel
        selectedLogins={selectedUsers}
        reportingList={reportingList}
        onUpdate={handleBulkUpdate}
        onClearAll={() => setSelectedUsers([])}
        onRemoveOne={(l) => setSelectedUsers((p) => p.filter((x) => x !== l))}
      />

      {/* TABLE */}
      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e5e7eb", marginTop: 8 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>
                <input type="checkbox" checked={allPageSelected} onChange={(e) => handleToggleAll(e.target.checked)} />
              </th>
              {["Login", "Name", "Phone", "Status", "Roles", "Version", "Reporting", "Blocks", "Actions"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <Spinner size={32} />
                    <span style={{ color: "#6b7280" }}>Loading page {page + 1}…</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                  No users found{filtersApplied ? " for current filters" : ""}
                </td>
              </tr>
            )}
            {users.map((u) => (
              <UserRow key={u.login} u={u} isSelected={selectedUsers.includes(u.login)}
                onToggleSelected={handleToggleOne} onView={handleView} onEdit={handleOpenEdit} />
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <Pagination page={page} size={size} total={totalUsers}
        onPage={setPage} onSize={(s) => { setSize(s); setPage(0); }} />

      {/* VIEW MODAL */}
      <ViewModal user={selectedUser} onClose={() => setSelectedUser(null)} />

      {/* EDIT MODAL */}
      <EditModal
        editUser={editUser} setEditUser={setEditUser}
        blocks={editBlocks} rolesList={editRolesList} reportingList={reportingList}
        selectedBlocks={editSelectedBlocks} setSelectedBlocks={setEditSelectedBlocks}
        selectedRoles={editSelectedRoles} setSelectedRoles={setEditSelectedRoles}
        selectedReporting={editSelectedReporting} setSelectedReporting={setEditSelectedReporting}
        onSave={handleSave} onCancel={handleCancelEdit}
      />

      {/* HIERARCHY OVERLAY */}
      {showHierarchy && (
        <div style={{ position: "fixed", inset: 0, background: "#f5f7fa", zIndex: 9999, display: "flex", flexDirection: "column" }}>
          <div style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>User Hierarchy</h3>
            <div style={{ position: "relative", marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ ...S.searchBox, maxWidth: 280, border: "1px solid #d1d5db" }}>
                <span style={{ color: "#9ca3af", fontSize: 13 }}>🔍</span>
                <input placeholder="Search by login / name…" value={hierarchySearch}
                  onChange={(e) => setHierarchySearch(e.target.value)}
                  style={{ ...S.searchInput, width: 220 }} />
                {hierarchySearch && <button onClick={() => setHierarchySearch("")} style={S.clearBtn}>✕</button>}
              </div>
              {searchingHierarchy && <Spinner size={16} inline />}
              {highlightedUser && !searchingHierarchy && (
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>Found: {highlightedUser}</span>
              )}
              {!searchingHierarchy && hierarchySearch && !highlightedUser && (
                <span style={{ fontSize: 12, color: "#dc2626" }}>Not found</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={S.miniBtn} onClick={() => setZoom((z) => Math.min(z + 0.15, 3))}>＋</button>
              <button style={S.miniBtn} onClick={() => setZoom((z) => Math.max(z - 0.15, 0.3))}>−</button>
              <button style={S.miniBtn} onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}>Reset</button>
              <button style={{ ...S.primaryBtn, background: "#dc2626" }} onClick={closeHierarchy}>✕ Close</button>
            </div>
          </div>

          <div
            onWheel={handleWheel} onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            style={{ flex: 1, overflow: "hidden", cursor: isPanning ? "grabbing" : "grab", position: "relative", background: "#f8fafc" }}>
            {hierarchyLoading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <Spinner size={36} />
                <span style={{ color: "#6b7280" }}>Loading hierarchy…</span>
              </div>
            )}
            {!hierarchyLoading && hierarchyData.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                No hierarchy data available
              </div>
            )}
            {!hierarchyLoading && hierarchyData.length > 0 && (
              <div style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: "top left",
                transition: isPanning ? "none" : "transform 0.1s",
                width: "100%", height: "100%",
              }}>
                <DndProvider backend={HTML5Backend}>
                  <div style={{ width: "100%", height: "calc(100vh - 56px)" }}>
                    <Tree
                      key={hierarchyKey}
                      data={convertToD3(hierarchyData)}
                      orientation="vertical"
                      pathFunc="diagonal"
                      translate={{ x: window.innerWidth / 2, y: 80 }}
                      nodeSize={{ x: 260, y: 160 }}
                      separation={{ siblings: 1.2, nonSiblings: 1.6 }}
                      zoom={1}
                      scaleExtent={{ min: 0.1, max: 3 }}
                      renderCustomNodeElement={({ nodeDatum, toggleNode }) => (
                        <g>
                          <HierarchyD3Node
                            nodeDatum={nodeDatum} toggleNode={toggleNode}
                            hierarchyData={hierarchyData} loadChildren={loadChildren}
                            reloadAllData={reloadAllData} setLoading={setLoading}
                            openHierarchyEdit={openHierarchyEdit}
                            highlightedUser={highlightedUser}
                            reportingListEdit={reportingList}
                            setReportingListEdit={setReportingList}
                          />
                        </g>
                      )}
                    />
                  </div>
                </DndProvider>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HIERARCHY EDIT MODAL */}
      <HierarchyEditModal
        user={hierarchyEditUser} reportingList={reportingList}
        onSave={handleHierarchyEditSave} onCancel={() => setHierarchyEditUser(null)}
      />

      {/* LOADING OVERLAY for edit/save operations */}
      {loading && editUser === null && !showHierarchy && users.length > 0 && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "white", borderRadius: 10, padding: "10px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 10, zIndex: 99998, border: "1px solid #e5e7eb" }}>
          <Spinner size={18} inline />
          <span style={{ fontSize: 13, color: "#374151" }}>Updating…</span>
        </div>
      )}
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────
const S = {
  page: { padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111827", minHeight: "100vh" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12, flexWrap: "wrap" },
  searchBox: { display: "flex", alignItems: "center", gap: 8, border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", background: "white", flex: 1, maxWidth: 400 },
  searchInput: { border: "none", outline: "none", flex: 1, fontSize: 14, background: "transparent" },
  clearBtn: { border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 12 },
  primaryBtn: { background: "#f97316", color: "white", border: "none", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 },
  filterPanel: { display: "flex", flexWrap: "wrap", gap: 10, padding: "14px 16px", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 12 },
  filterSelect: { height: 34, padding: "0 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "white", cursor: "pointer" },
  filterChip: { display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 4, background: "#fff7ed", color: "#c2410c", fontSize: 12, border: "1px solid #fed7aa" },
  bulkPanel: { border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 8, padding: "12px 14px", marginBottom: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { background: "#f9fafb", padding: "10px 12px", borderBottom: "2px solid #e5e7eb", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" },
  td: { padding: "9px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top", fontSize: 13 },
  viewBtn: { padding: "4px 7px", marginRight: 4, background: "#059669", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
  editBtn: { padding: "4px 7px", background: "#2563eb", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
  paginationBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", borderTop: "1px solid #e5e7eb", marginTop: 0, flexWrap: "wrap", gap: 10 },
  pageBtn: { padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 4, background: "white", cursor: "pointer", fontSize: 13, minWidth: 32 },
  smallSelect: { padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 },
  modal: { background: "white", borderRadius: 12, padding: "18px 20px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: 12, marginBottom: 14 },
  closeBtn: { background: "#dc2626", color: "white", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  scrollBox: { overflowY: "auto", flex: 1 },
  detailKey: { fontWeight: 600, padding: "7px 12px 7px 0", color: "#374151", width: "38%", borderBottom: "1px solid #f3f4f6", fontSize: 13 },
  formRow: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  formLabel: { width: 120, fontWeight: 600, fontSize: 13, color: "#374151", paddingTop: 6, flexShrink: 0 },
  formInput: { flex: 1, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, outline: "none", width: "100%" },
  chip: { display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontSize: 12 },
  saveBtnLarge: { background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  cancelBtnLarge: { background: "#f3f4f6", color: "#374151", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: 13 },
  dropBtn: { display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13, minWidth: 160 },
  dropMenu: { position: "absolute", top: "calc(100% + 4px)", left: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.12)", zIndex: 1000, minWidth: 200 },
  dropSearch: { width: "100%", padding: "8px 10px", border: "none", borderBottom: "1px solid #f3f4f6", outline: "none", fontSize: 13 },
  dropList: { maxHeight: 200, overflowY: "auto" },
  dropItem: { padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f9fafb" },
  miniBtn: { padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 5, background: "white", cursor: "pointer", fontSize: 12 },
};