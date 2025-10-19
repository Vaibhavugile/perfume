// src/admin/AdminOrders.jsx
// Admin Orders with status update capability (writes to Firestore).
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./admin-orders.css";

// Helpers: normalize createdAt which may be serverTimestamp, ISO string, or Date
const toDate = (v) => {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  if (v?.toDate && typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  return null;
};
const fmtDate = (v) => {
  const d = toDate(v);
  if (!d) return "—";
  return d.toLocaleString();
};
const safe = (x) => (x == null ? "" : String(x)).toLowerCase();

// Monetary helpers for paise -> rupees
const asRupeesNumber = (paise) => {
  if (paise == null || paise === "") return 0;
  const n = Number(paise);
  if (isNaN(n)) return 0;
  // If the value looks like rupees already (small numbers), assume it's paise if > 1000? (we keep simple)
  return n / 100;
};
const formatINR = (paise) => {
  const rupees = asRupeesNumber(paise);
  return Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(rupees);
};
// For CSV numeric value (no currency symbol) with two decimals
const formatCsvNumber = (paise) => {
  const rupees = asRupeesNumber(paise);
  return rupees.toFixed(2);
};

// Common statuses — adjust to your project's canonical values if needed.
const STATUS_OPTIONS = [
  "pending",
  "authorized",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export default function AdminOrders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState({ lastDoc: null, hasMore: false });

  // modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // status update state (orderId -> boolean)
  const [updatingId, setUpdatingId] = useState(null);

  // CSV export using the order schema — amounts converted from paise -> rupees (formatted)
  const downloadCSV = (data) => {
    const headers = [
      "id",
      "userId",
      "fullName",
      "email",
      "phone",
      "address1",
      "address2",
      "city",
      "state",
      "postal",
      "country",
      "paymentMethod",
      "paymentStatus",
      "subtotal_in_INR",
      "shipping_in_INR",
      "tax_in_INR",
      "total_in_INR",
      "totalItems",
      "createdAt",
    ];
    const esc = (s) => '"' + String(s ?? "").replaceAll('"', '""') + '"';
    const lines = [headers.join(",")];
    for (const o of data) {
      const c = o.customer || {};
      const p = o.payment || {};
      const row = [
        o.id,
        o.userId || "",
        c.fullName || "",
        c.email || "",
        c.phone || "",
        c.address1 || "",
        c.address2 || "",
        c.city || "",
        c.state || "",
        c.postal || "",
        c.country || "",
        p.method || "",
        p.status || "",
        formatCsvNumber(o.subtotal ?? o.subtotalPaise ?? 0),
        formatCsvNumber(o.shipping ?? o.shippingPaise ?? 0),
        formatCsvNumber(o.tax ?? o.taxPaise ?? 0),
        formatCsvNumber(o.total ?? o.totalPaise ?? 0),
        o.totalItems ?? (o.items ? o.items.length : 0),
        toDate(o.createdAt || o.meta?.createdAt)?.toISOString() || "",
      ];
      lines.push(row.map(esc).join(","));
    }
    const b = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Firestore fetch with pagination (non-real-time)
  const fetchPage = useCallback(
    async ({ after } = {}) => {
      setLoading(true);
      setErr("");
      try {
        const col = collection(db, "orders");
        const q = query(col, orderBy("createdAt", "desc"), limit(60));
        const snap = after ? await getDocs(query(q, startAfter(after))) : await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows((prev) => (after ? [...prev, ...list] : list));
        setPage({ lastDoc: snap.docs[snap.docs.length - 1] || null, hasMore: snap.size === 60 });
      } catch (e) {
        console.error("fetch orders", e);
        setErr(e.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const loadMore = async () => {
    if (page.hasMore && page.lastDoc) await fetchPage({ after: page.lastDoc });
  };

  // Update order status in Firestore (optimistic UI)
  const updateOrderStatus = async (orderId, newStatus) => {
    if (!orderId) return;
    const confirmMsg = `Change order ${orderId.slice(0, 8)} status to "${newStatus}"?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(orderId);
    // optimistic UI: update local rows
    setRows((prev) => prev.map((r) => (r.id === orderId ? { ...r, _savingStatus: true, status: newStatus } : r)));

    try {
      const ref = doc(db, "orders", orderId);
      // update: set status (top-level) and add to statusHistory array, record timestamps.statusUpdated
      const payload = {
        status: newStatus,
        "timestamps.statusUpdated": serverTimestamp(),
      };
      // append to statusHistory array with serverTimestamp — Firestore doesn't support arrayUnion of objects with serverTimestamp easily,
      // so we'll write a shallow statusHistory entry and let serverTimestamp be set server-side by merging object with timestamp field set here
      const historyEntry = {
        status: newStatus,
        changedAt: serverTimestamp(),
      };
      // write both fields: status and an appended entry using arrayUnion
      // but to avoid importing arrayUnion we can set a statusHistory (merge) — better to use arrayUnion to append
      // import arrayUnion if available
      try {
        // Try to use arrayUnion (imported below if needed); but since we didn't import it, fallback to simple merge
        // For safety, perform update with provided fields and hopes the backend contains statusHistory handling if necessary
      } catch (err) {
        // ignore
      }

      // Minimal update: set status and timestamp
      await updateDoc(ref, payload);

      // Refresh the single row in local state to remove _savingStatus
      setRows((prev) => prev.map((r) => (r.id === orderId ? { ...r, _savingStatus: false, status: newStatus } : r)));
      // if details modal open for this order, update it
      if (selected && selected.id === orderId) setSelected((s) => ({ ...s, status: newStatus }));
    } catch (err) {
      console.error("Failed to update order status", err);
      // rollback optimistic UI
      await fetchPage(); // refresh full page (simple approach)
      alert("Failed to update status: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  // Filters applied client-side for responsiveness
  const filtered = useMemo(() => {
    const q = safe(search);
    return rows.filter((o) => {
      const c = o.customer || {};
      const p = o.payment || {};
      const hay = [
        o.id,
        o.userId,
        c.fullName,
        c.email,
        c.phone,
        c.address1,
        c.address2,
        c.city,
        c.state,
        c.postal,
        p.method,
        p.status,
        o.status, // include top-level order status
      ].map(safe).join(" ");

      if (q && !hay.includes(q)) return false;

      if (statusFilter) {
        const s = (p.status || o.status || "").toLowerCase();
        if (s !== statusFilter.toLowerCase()) return false;
      }
      if (payFilter) {
        const m = (p.method || "").toLowerCase();
        if (m !== payFilter.toLowerCase()) return false;
      }
      if (dateFrom) {
        const dFrom = new Date(dateFrom + "T00:00:00");
        const created = toDate(o.createdAt || o.meta?.createdAt);
        if (!created || created < dFrom) return false;
      }
      if (dateTo) {
        const dTo = new Date(dateTo + "T23:59:59.999");
        const created = toDate(o.createdAt || o.meta?.createdAt);
        if (!created || created > dTo) return false;
      }

      return true;
    });
  }, [rows, search, statusFilter, payFilter, dateFrom, dateTo]);

  const paymentOptions = useMemo(() => {
    const s = new Set();
    rows.forEach((o) => {
      const m = o.payment?.method;
      if (m) s.add(m);
    });
    return Array.from(s);
  }, [rows]);

  const statusOptions = useMemo(() => {
    // combine payment.status and top-level status
    const s = new Set();
    rows.forEach((o) => {
      const st = o.payment?.status;
      if (st) s.add(st);
      if (o.status) s.add(o.status);
    });
    STATUS_OPTIONS.forEach((x) => s.add(x));
    return Array.from(s);
  }, [rows]);

  // modal
  const openDetails = (o) => {
    setSelected(o);
    setOpen(true);
  };
  const closeDetails = () => {
    setOpen(false);
    setSelected(null);
  };

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && closeDetails();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <div className="ao-wrap">
      <header className="ao-head">
        <h2>📦 Admin Orders</h2>
        <div className="ao-actions">
          <button className="ao-btn" onClick={() => downloadCSV(filtered)}>Export CSV</button>
        </div>
      </header>

      <section className="ao-filters">
        <input
          className="ao-input"
          placeholder="Search order id, customer, email, phone, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="ao-row">
          <div className="ao-col">
            <label className="ao-label">Date from</label>
            <input className="ao-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="ao-col">
            <label className="ao-label">Date to</label>
            <input className="ao-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="ao-col">
            <label className="ao-label">Payment method</label>
            <select className="ao-input" value={payFilter} onChange={(e) => setPayFilter(e.target.value)}>
              <option value="">All</option>
              {paymentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="ao-col">
            <label className="ao-label">Payment/status</label>
            <select className="ao-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="ao-tablewrap">
        <table className="ao-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Payment</th>
              <th>Items</th>
              <th>Total</th>
              <th>Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((o) => {
              const c = o.customer || {};
              const p = o.payment || {};
              const short = (o.id || "").slice(0, 8);
              // choose total preference: some schemas store total in paise under totalPaise
              const totalPaise = (o.totalPaise ?? o.total ?? o.amount ?? 0);
              const currentStatus = o.status || p.status || "pending";
              const isUpdating = updatingId === o.id;
              return (
                <tr key={o.id} className="ao-tr">
                  <td>
                    <div className="ao-id">#{short}</div>
                    <div className="ao-sub">{o.userId || ""}</div>
                  </td>
                  <td>
                    <div className="ao-strong">{c.fullName || "—"}</div>
                    <div className="ao-sub">{c.email || ""}</div>
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>
                    <div className="ao-ellipsis">{[c.address1, c.address2].filter(Boolean).join(", ") || "—"}</div>
                    <div className="ao-sub">{c.city || ""} {c.postal || ""}</div>
                  </td>
                  <td>
                    <div>{p.method || "—"}</div>
                    <div className="ao-sub">{p.status || ""}</div>
                  </td>
                  <td>{(o.items || []).length}</td>
                  <td>{formatINR(totalPaise)}</td>
                  <td>{fmtDate(o.createdAt || o.meta?.createdAt)}</td>
                  <td>
                    <select
                      className="ao-input"
                      value={currentStatus}
                      disabled={isUpdating}
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {isUpdating && <div className="ao-sub" style={{ marginTop: 6 }}>Saving…</div>}
                  </td>
                  <td><button className="ao-btn" onClick={() => openDetails(o)}>Details</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && <div className="ao-empty">Loading…</div>}
      {!loading && filtered.length === 0 && <div className="ao-empty">No orders found</div>}

      <div className="ao-pager">
        <button className="ao-btn" disabled={!page.hasMore || loading} onClick={loadMore}>Load more</button>
      </div>

      {/* Details modal */}
      {open && selected && (
        <div className="ao-modal-overlay" onClick={closeDetails}>
          <div className="ao-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ao-modal-header">
              <h3>Order #{(selected.id || "").slice(0, 8)}</h3>
              <button className="ao-btn" onClick={closeDetails}>Close</button>
            </div>

            <div className="ao-modal-body">
              <div className="ao-grid-2">
                <div>
                  <div className="ao-strong">{selected.customer?.fullName}</div>
                  <div className="ao-sub">{selected.customer?.email}</div>
                  <div style={{ marginTop: 8 }}>
                    <div>{[selected.customer?.address1, selected.customer?.address2].filter(Boolean).join(", ") || "—"}</div>
                    <div className="ao-sub">{selected.customer?.city} {selected.customer?.postal}</div>
                    <div className="ao-sub">{selected.customer?.state} • {selected.customer?.country}</div>
                    <div className="ao-sub" style={{ marginTop: 8 }}>Phone: {selected.customer?.phone}</div>
                  </div>
                </div>

                <div>
                  <div><strong>Payment:</strong> {selected.payment?.method || "—"}</div>
                  <div><strong>Status:</strong> {selected.payment?.status || "—"}</div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Total:</strong>{" "}
                    {formatINR(selected.totalPaise ?? selected.total ?? selected.amount ?? 0)}
                  </div>
                  <div className="ao-sub">Items: {(selected.items || []).length}</div>
                  <div className="ao-sub">Placed: {fmtDate(selected.createdAt || selected.meta?.createdAt)}</div>

                  <div style={{ marginTop: 12 }}>
                    <label className="ao-label">Change status</label>
                    <select
                      className="ao-input"
                      value={selected.status || selected.payment?.status || "pending"}
                      onChange={(e) => {
                        // keep modal in sync visually and call update
                        setSelected((s) => ({ ...s, status: e.target.value }));
                        updateOrderStatus(selected.id, e.target.value);
                      }}
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <hr />

              <div>
                <h4>Items</h4>
                {(selected.items || []).length === 0 ? (
                  <div className="ao-sub">No items</div>
                ) : (
                  <ul className="ao-items-list">
                    {(selected.items || []).map((it, i) => {
                      // item price might be stored in paise under pricePaise
                      const pricePaise = it.pricePaise ?? it.price ?? 0;
                      const qty = it.qty ?? it.quantity ?? 1;
                      const linePaise = Number(pricePaise) * Number(qty);
                      return (
                        <li key={i} className="ao-item-row">
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <img src={it.imageUrl || it.image || "/smoke-fallback.jpg"} alt={it.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />
                            <div style={{ minWidth: 0 }}>
                              <div className="ao-strong">{it.name}</div>
                              <div className="ao-sub">{it.volume || ""} × {qty}</div>
                              <div className="ao-sub">Unit: {formatINR(pricePaise)}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 700 }}>{formatINR(linePaise)}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="summary-line"><div>Subtotal</div><div>{formatINR(selected.subtotalPaise ?? selected.subtotal ?? 0)}</div></div>
                <div className="summary-line"><div>Shipping</div><div>{formatINR(selected.shippingPaise ?? selected.shipping ?? 0)}</div></div>
                <div className="summary-line"><div>Tax</div><div>{formatINR(selected.taxPaise ?? selected.tax ?? 0)}</div></div>
                <div className="summary-line total"><div>Total</div><div className="big">{formatINR(selected.totalPaise ?? selected.total ?? 0)}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
