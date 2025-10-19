// src/pages/Orders.jsx
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { formatPrice } from "../services/productsService";
import "./orders.css"; // in case some utility card classes used

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]); // lightweight user order entries (merged with canonical when available)
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [expandedOrderFull, setExpandedOrderFull] = useState(null);
  const [expanding, setExpanding] = useState(false);

  const [searchQ, setSearchQ] = useState("");

  // keep track of active snapshot unsubscribe for expanded order
  const expandedUnsubRef = useRef(null);

  // Helper: extract a meaningful status from different possible doc shapes
  function getStatusFromDoc(d) {
    if (!d) return "pending";
    if (d.status) return d.status;
    if (d.payment && d.payment.status) return d.payment.status;
    if (d.lab && d.lab.status) return d.lab.status;
    if (d.report && d.report.status) return d.report.status;
    if (d.meta && d.meta.status) return d.meta.status;
    return "pending";
  }

  // --- Helpers (NO paise conversion: assume values are already formatted in DB) ---
  function formatDate(val) {
    try {
      if (!val) return "";
      if (val.toDate && typeof val.toDate === "function") return new Date(val.toDate()).toLocaleString();
      return new Date(val).toLocaleString();
    } catch {
      return String(val);
    }
  }

  function displayPriceFromOrder(o) {
    const cand = o.total ?? o.subtotal ?? 0;
    return formatPrice(cand);
  }

  function itemLinePriceFormatted(it) {
    const price = it.price ?? it.unitPrice ?? 0;
    const qty = it.qty ?? it.quantity ?? 1;
    return formatPrice(price * qty);
  }

  // --- load lightweight user orders, then attempt to merge canonical /orders/{orderId} docs ---
  useEffect(() => {
    let mounted = true;
    async function loadOrders() {
      setLoading(true);
      setError("");
      setOrders([]);
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userOrdersRef = collection(db, "users", user.uid, "orders");
        const q = query(userOrdersRef, orderBy("createdAt", "desc"), limit(100));
        const snap = await getDocs(q);

        if (!mounted) return;
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            orderId: data.orderId || d.id,
            createdAt: data.createdAt || data.created || null,
            subtotal: data.subtotal ?? null,
            total: data.total ?? null,
            totalItems: data.totalItems || 0,
            status: data.status || (data.payment && data.payment.status) || "pending",
            payment: data.payment || null,
            thumbnail: data.thumbnail || null,
            _summary: data,
            items: data.items || [],
          });
        });

        // show lightweight list right away
        setOrders(list);

        // fetch canonical docs for visible entries (first N)
        const TAKE = Math.min(50, list.length);
        const toFetch = list.slice(0, TAKE);
        const fetchPromises = toFetch.map(async (entry) => {
          try {
            const canonicalRef = doc(db, "orders", entry.orderId || entry.id);
            const cSnap = await getDoc(canonicalRef);
            if (cSnap.exists()) {
              return { id: entry.id, canonical: { id: cSnap.id, ...cSnap.data() } };
            }
            return { id: entry.id, canonical: null };
          } catch (err) {
            console.warn("Failed to fetch canonical order for", entry.orderId || entry.id, err);
            return { id: entry.id, canonical: null };
          }
        });

        const fetched = await Promise.all(fetchPromises);
        if (!mounted) return;

        // merge canonical into list, using getStatusFromDoc to capture whichever status exists
        const merged = list.map((entry) => {
          const found = fetched.find((f) => f.id === entry.id);
          if (found && found.canonical) {
            const c = found.canonical;
            return {
              ...entry,
              _canonicalAvailable: true,
              canonicalRefId: c.id,
              status: getStatusFromDoc(c) ?? entry.status,
              payment: c.payment ?? entry.payment,
              total: c.total ?? entry.total,
              subtotal: c.subtotal ?? entry.subtotal,
              items: c.items ?? entry.items ?? [],
              createdAt: c.createdAt ?? entry.createdAt,
              ...c,
            };
          }
          return entry;
        });

        setOrders(merged);
      } catch (err) {
        console.error("Failed to load user orders:", err);
        setError("Could not load your orders. Please try again later.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (!authLoading) loadOrders();

    return () => { mounted = false; };
  }, [user, authLoading]);

  // Search/filter: client-side over loaded orders
  const qLower = (searchQ || "").trim().toLowerCase();
  const filteredOrders = React.useMemo(() => {
    if (!qLower) return orders;
    return orders.filter((o) => {
      const hay = [
        o.id,
        o.orderId,
        o._summary?.email,
        o._summary?.fullName,
        o._summary?.phone,
        (o.payment && o.payment.status),
        (o.payment && o.payment.method),
        ...(o.items || []).map((it) => it.name || it.sku || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qLower);
    });
  }, [orders, qLower]);

  // Expand order: prefer canonical /orders/{orderId} doc and subscribe to realtime updates for expanded order
  async function expandOrder(orderId, userOrderDocId = null) {
    // collapse if same
    if (expandedOrderId === orderId) {
      if (expandedUnsubRef.current) {
        expandedUnsubRef.current();
        expandedUnsubRef.current = null;
      }
      setExpandedOrderId(null);
      setExpandedOrderFull(null);
      return;
    }

    // cleanup previous
    if (expandedUnsubRef.current) {
      expandedUnsubRef.current();
      expandedUnsubRef.current = null;
    }

    setExpanding(true);
    setExpandedOrderFull(null);
    setExpandedOrderId(orderId);

    try {
      const canonicalRef = doc(db, "orders", orderId);
      const snap = await getDoc(canonicalRef);
      if (snap.exists()) {
        const canonical = { id: snap.id, ...snap.data() };
        setExpandedOrderFull(canonical);

        // subscribe to realtime updates for this canonical order so admin changes reflect immediately
        const unsubscribe = onSnapshot(canonicalRef, (docSnap) => {
          if (!docSnap.exists()) return;
          const data = { id: docSnap.id, ...docSnap.data() };
          setExpandedOrderFull(data);
          // also update list entry to reflect latest status
          const newStatus = getStatusFromDoc(data);
          setOrders((prev) =>
            prev.map((o) =>
              o.orderId === orderId || o.id === orderId
                ? {
                    ...o,
                    status: newStatus ?? o.status,
                    payment: data.payment ?? o.payment,
                    total: data.total ?? o.total,
                    subtotal: data.subtotal ?? o.subtotal,
                    items: data.items ?? o.items ?? [],
                    createdAt: data.createdAt ?? o.createdAt,
                    ...data,
                  }
                : o
            )
          );
        }, (err) => {
          console.warn("onSnapshot error for expanded order", err);
        });
        expandedUnsubRef.current = unsubscribe;
        setExpanding(false);
        return;
      }

      // fallback to user doc
      if (user) {
        const userOrderRef = doc(db, "users", user.uid, "orders", orderId);
        const s2 = await getDoc(userOrderRef);
        if (s2.exists()) {
          setExpandedOrderFull({ id: s2.id, ...s2.data(), _onlySummary: true });
        } else {
          setExpandedOrderFull(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch order details:", err);
      setError("Failed to fetch order details. Try again later.");
    } finally {
      setExpanding(false);
    }
  }

  // Cleanup snapshot on unmount
  useEffect(() => {
    return () => {
      if (expandedUnsubRef.current) {
        expandedUnsubRef.current();
        expandedUnsubRef.current = null;
      }
    };
  }, []);

  if (authLoading || loading) {
    return (
      <main className="checkout container">
        <h1>My Orders</h1>
        <div style={{ marginTop: 20 }}>
          <div className="skeleton-row">
            <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 8 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "40%", height: 12 }} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="checkout container">
        <h1>My Orders</h1>
        <div className="empty" style={{ marginTop: 20 }}>
          <h3>Please sign in to view your orders.</h3>
          <p className="muted">Orders are stored in your account and visible only to you.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout container">
      <h1>My Orders</h1>

      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

      {/* Search bar */}
      <div style={{ marginTop: 8, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="input"
          placeholder="Search orders by id, name, email, phone or product..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e6eef6" }}
        />
        <div className="muted small">Showing {filteredOrders.length} of {orders.length}</div>
      </div>

      {!filteredOrders.length ? (
        <div className="empty" style={{ marginTop: 20 }}>
          <h3>No orders found</h3>
          <p className="muted">Try clearing the search or place a new order.</p>
        </div>
      ) : (
        <div className="orders-list" style={{ marginTop: 12 }}>
          {filteredOrders.map((o) => {
            const totalDisplay = displayPriceFromOrder(o);
            const status = (o.status || (o.payment && o.payment.status) || "pending").toString();
            return (
              <div key={o.id} className="order-row">
                <div className="left">
                  <img src={o.thumbnail || "/smoke-fallback.png"} alt={`Order ${o.orderId}`} />
                  <div className="meta">
                    <div className="title">Order {o.orderId}</div>
                    <div className="sub">{formatDate(o.createdAt)} • {o.totalItems} item{(o.totalItems > 1) ? "s" : ""}</div>
                  </div>
                </div>

                <div className="right">
                  <div style={{ textAlign: "right", minWidth: 110 }}>
                    <div style={{ fontWeight: 800 }}>{totalDisplay}</div>
                    <div className="order-id small">{o.orderId}</div>
                  </div>

                  <div>
                    <span className={`badge ${status}`.replace(/\s+/g, " ").toLowerCase()}>{status.toUpperCase()}</span>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn ghost"
                      onClick={() => expandOrder(o.orderId, o.id)}
                      aria-expanded={expandedOrderId === o.orderId}
                    >
                      {expandedOrderId === o.orderId ? "Hide" : "View"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* expanded order details */}
          {expandedOrderId && (
            <div style={{ marginTop: 12 }}>
              {expanding ? (
                <div className="card" style={{ padding: 12 }}>
                  <div className="skeleton-row">
                    <div className="skeleton" style={{ width: 180, height: 18 }} />
                    <div className="skeleton" style={{ width: 80, height: 18 }} />
                  </div>
                </div>
              ) : expandedOrderFull ? (
                <div className="card order-details">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>Order {expandedOrderFull.id}</div>
                      <div className="muted small">{formatDate(expandedOrderFull.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{displayPriceFromOrder(expandedOrderFull)}</div>
                      <div className={`badge ${(getStatusFromDoc(expandedOrderFull) || "pending").toLowerCase()}`} style={{ marginTop: 6 }}>
                        {(getStatusFromDoc(expandedOrderFull) || "pending").toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="items" style={{ marginTop: 12 }}>
                    {(expandedOrderFull.items || []).map((it, idx) => (
                      <div key={idx} className="item">
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <img src={it.imageUrl || "/smoke-fallback.jpg"} alt={it.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                          <div>
                            <div style={{ fontWeight: 700 }}>{it.name}</div>
                            <div className="muted small">{it.volume || ""} × {it.qty}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700 }}>{itemLinePriceFormatted(it)}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div className="summary-line">
                      <div>Subtotal</div>
                      <div>{formatPrice(expandedOrderFull.subtotal ?? 0)}</div>
                    </div>
                    <div className="summary-line">
                      <div>Shipping</div>
                      <div>{formatPrice(expandedOrderFull.shipping ?? 0)}</div>
                    </div>
                    <div className="summary-line total">
                      <div>Total</div>
                      <div className="big">{displayPriceFromOrder(expandedOrderFull)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button className="btn primary" onClick={() => window.print()}>Print</button>
                    <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(expandedOrderFull.id || "")}>Copy ID</button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="muted">No detailed order data available for this order.</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
