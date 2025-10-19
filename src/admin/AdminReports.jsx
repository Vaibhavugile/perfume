// src/admin/AdminReports.jsx
// Admin reports optimized for larger datasets: server-side pagination, batched export, presets, incremental aggregates.
// Place at src/admin/AdminReports.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  startAfter,
  limit as fbLimit,
} from "firebase/firestore";
import "./admin-reports.css";

const DEFAULT_PAGE_SIZE = 200; // fetch size per page for browsing (tune up/down)
const EXPORT_BATCH = 500; // batch size for "Export All" (tune depending on memory/time)
const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All", days: 0 },
];

// Helpers to normalize timestamps / totals
const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v === "string") return new Date(v);
  if (v instanceof Date) return v;
  return null;
};
const getTotalPaise = (o) => {
  // prefer explicit paise fields; fallback to other conventions
  return Number(o.totalPaise ?? o.total ?? o.amount ?? 0);
};
const paiseToRupeesNumber = (p) => Number(p) / 100;
const fmtINR = (p) =>
  Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    paiseToRupeesNumber(Number(p ?? 0))
  );

// incremental aggregator
function computeAggregates(orders) {
  const salesByDay = {};
  const prodMap = {};
  for (const o of orders) {
    const t = toDate(o.createdAt ?? o.meta?.createdAt ?? Date.now());
    const day = (t && t.toISOString().slice(0, 10)) || "unknown";
    const totalPaise = getTotalPaise(o) || 0;
    salesByDay[day] = (salesByDay[day] || 0) + Number(totalPaise);

    (o.items || []).forEach((it) => {
      const key = it.id || it.sku || it.name || JSON.stringify(it);
      if (!prodMap[key]) prodMap[key] = { name: it.name || it.sku || "Unknown", qty: 0, revenuePaise: 0 };
      const qty = Number(it.qty ?? it.quantity ?? 1);
      const pricePaise = Number(it.pricePaise ?? it.price ?? 0);
      prodMap[key].qty += qty;
      prodMap[key].revenuePaise += pricePaise * qty;
    });
  }
  const days = Object.keys(salesByDay)
    .sort()
    .map((d) => ({ day: d, totalPaise: salesByDay[d] }));
  const prods = Object.entries(prodMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.qty - a.qty);
  return { salesByDay: days, topProducts: prods };
}

export default function AdminReports() {
  const [loading, setLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState([]); // orders loaded so far (paged)
  const [lastDocSnapshot, setLastDocSnapshot] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [preset, setPreset] = useState("30 days");
  const [searchQ, setSearchQ] = useState("");

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ done: 0, totalBatches: 0 });

  // ref to cancel exporting if user navigates away (simple flag)
  const exportCancelRef = useRef(false);

  // load first page whenever date filters or pageSize change
  useEffect(() => {
    setOrdersPage([]);
    setLastDocSnapshot(null);
    setHasMore(false);
    // quick run to fetch first page
    fetchNextPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, pageSize, preset]);

  // compute dateFrom/dateTo from preset if user picks preset
  useEffect(() => {
    const p = PRESETS.find((x) => x.label === preset);
    if (!p) return;
    if (p.days === 0) {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const to = new Date();
    const from = new Date(Date.now() - (p.days - 1) * 24 * 60 * 60 * 1000);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // Build Firestore query with date filters
  const buildBaseQuery = () => {
    const col = collection(db, "orders");
    const clauses = [];
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      clauses.push(where("createdAt", ">=", from));
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59.999");
      clauses.push(where("createdAt", "<=", to));
    }
    // always order by createdAt desc
    return { col, clauses, orderField: "createdAt" };
  };

  // fetch page
  async function fetchNextPage({ reset = false } = {}) {
    setLoading(true);
    try {
      const { col, clauses, orderField } = buildBaseQuery();
      const qParts = [col, orderBy(orderField, "desc"), fbLimit(pageSize), ...clauses];
      let q = query(...qParts);
      if (!reset && lastDocSnapshot) {
        q = query(...qParts, startAfter(lastDocSnapshot));
      }
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrdersPage((prev) => (reset ? docs : [...prev, ...docs]));
      setLastDocSnapshot(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === pageSize);
    } catch (err) {
      console.error("reports: fetchNextPage failed", err);
    } finally {
      setLoading(false);
    }
  }

  // Derived incremental aggregations (only from ordersPage currently loaded)
  const aggregates = useMemo(() => computeAggregates(ordersPage), [ordersPage]);
  const totalSalesPaise = useMemo(() => aggregates.salesByDay.reduce((s, d) => s + (d.totalPaise || 0), 0), [aggregates]);
  const totalOrders = useMemo(() => ordersPage.length, [ordersPage]);

  // client-side search over loaded page (keeps browsing fast)
  const filteredOrders = useMemo(() => {
    const q = (searchQ || "").trim().toLowerCase();
    if (!q) return ordersPage;
    return ordersPage.filter((o) => {
      const hay = [
        o.id,
        o.userId,
        o.customer?.fullName,
        o.customer?.email,
        o.customer?.phone,
        o.items?.map((it) => it.name)?.join(" "),
      ].join(" ") .toLowerCase();
      return hay.includes(q);
    });
  }, [ordersPage, searchQ]);

  // Export: pages through all orders matching the filters in batched queries
  async function exportAllAsCSV() {
    if (!window.confirm("Export all matching orders as CSV? This will page through server results.")) return;
    setExporting(true);
    exportCancelRef.current = false;
    setExportProgress({ done: 0, totalBatches: 0 });

    try {
      const { col, clauses, orderField } = buildBaseQuery();
      let allLines = [];
      const headers = ["orderId", "createdAt", "total_INR", "items"];
      allLines.push(headers.join(","));

      // We'll batch-read until a batch returns zero docs
      let last = null;
      let batchNum = 0;
      while (true) {
        if (exportCancelRef.current) break;
        const qParts = [col, orderBy(orderField, "desc"), fbLimit(EXPORT_BATCH), ...clauses];
        let q = last ? query(...qParts, startAfter(last)) : query(...qParts);
        const snap = await getDocs(q);
        if (snap.empty) break;
        const docs = snap.docs;
        for (const d of docs) {
          const o = { id: d.id, ...d.data() };
          const created = toDate(o.createdAt)?.toISOString() || "";
          const totalPaise = getTotalPaise(o);
          const items = (o.items || []).map((it) => `${it.name || it.sku || it.id} x${it.qty ?? it.quantity ?? 1}`).join("; ");
          const totalRupees = paiseToRupeesNumber(totalPaise).toFixed(2);
          // escape double quotes in items
          allLines.push([`"${o.id}"`, `"${created}"`, `${totalRupees}`, `"${(items || "").replaceAll('"','""')}"`].join(","));
        }
        batchNum++;
        setExportProgress((p) => ({ ...p, done: batchNum }));
        last = docs[docs.length - 1];
        // end condition
        if (docs.length < EXPORT_BATCH) break;
      }

      // produce CSV blob and download
      const blob = new Blob([allLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports_all_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("reports export failed", err);
      alert("Export failed: " + (err.message || err));
    } finally {
      setExporting(false);
      exportCancelRef.current = false;
    }
  }

  return (
    <div className="ar-wrap">
      <div className="ar-head">
        <div>
          <h1>Reports</h1>
          <div className="ar-muted">Incremental view & batched export for large datasets</div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input className="ar-input ar-search" placeholder="Search loaded orders..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
          <button className="ar-btn" onClick={() => { setOrdersPage([]); fetchNextPage({ reset: true }); }}>Refresh</button>
          <button className="ar-btn ar-ghost" onClick={exportAllAsCSV} disabled={exporting}>
            {exporting ? `Exporting… (${exportProgress.done})` : "Export All"}
          </button>
        </div>
      </div>

      <div className="ar-controls">
        <div className="ar-presets">
          {PRESETS.map((p) => (
            <button key={p.label} className={`ar-pres ${preset === p.label ? "active" : ""}`} onClick={() => setPreset(p.label)}>{p.label}</button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label className="ar-small">Page size</label>
          <select className="ar-input" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="ar-cards">
        <div className="ar-card compact">
          <div className="ar-card-row">
            <div>
              <div className="ar-card-title">Totals (loaded)</div>
              <div className="ar-muted">This summary is computed from the orders you've loaded so far (use Load more to fetch additional pages)</div>
            </div>
            <div className="ar-chips" style={{ marginLeft: "auto" }}>
              <span className="ar-chip">Orders: {totalOrders}</span>
              <span className="ar-chip">Sales: {fmtINR(totalSalesPaise)}</span>
            </div>
          </div>

          <div className="ar-grid compact">
            <div className="ar-subcard">
              <h4>Sales by day</h4>
              {aggregates.salesByDay.length === 0 ? <div className="ar-muted">No data (load pages)</div> : (
                <div className="ar-scroll">
                  <table className="ar-table">
                    <thead>
                      <tr><th>Date</th><th>Sales</th></tr>
                    </thead>
                    <tbody>
                      {aggregates.salesByDay.map((s) => (
                        <tr key={s.day}><td>{s.day}</td><td className="ar-strong">{fmtINR(s.totalPaise)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ar-subcard">
              <h4>Top products (loaded)</h4>
              {aggregates.topProducts.length === 0 ? <div className="ar-muted">No products yet</div> : (
                <div className="ar-scroll">
                  <table className="ar-table ar-table-condensed">
                    <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {aggregates.topProducts.slice(0, 100).map((p) => (
                        <tr key={p.id}><td className="ar-product-name">{p.name}</td><td>{p.qty}</td><td className="ar-strong">{fmtINR(p.revenuePaise)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <button className="ar-btn" onClick={() => fetchNextPage({ reset: true })}>Reload (first page)</button>
            <button className="ar-btn" onClick={() => fetchNextPage({ reset: false })} disabled={!hasMore || loading}>{loading ? "Loading…" : (hasMore ? "Load more" : "No more")}</button>
            <div style={{ marginLeft: "auto" }} className="ar-muted">Loaded: {ordersPage.length} orders</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="ar-muted">Tip: For extremely large datasets consider offline aggregation (Cloud Function / BigQuery) for faster queries and exports.</div>
      </div>
    </div>
  );
}
