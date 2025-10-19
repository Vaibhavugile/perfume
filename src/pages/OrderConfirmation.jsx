// src/pages/OrderConfirmation.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "../services/productsService";
import "../styles/checkout.css";

// Firestore
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const LAST_ORDER_ID_KEY = "lastOrderId";

export default function OrderConfirmation() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function fetchOrderFromFirestore(orderId) {
      try {
        const ref = doc(db, "orders", orderId);
        const snap = await getDoc(ref);
        if (!mounted) return;
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
        } else {
          setFetchError("Order not found in database.");
        }
      } catch (err) {
        console.error("Failed to fetch order from Firestore:", err);
        setFetchError("Failed to load order from server.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    try {
      const lastOrderId = localStorage.getItem(LAST_ORDER_ID_KEY);
      const lastOrderSnapshot = localStorage.getItem("lastOrder");

      if (lastOrderId) {
        // try Firestore first
        fetchOrderFromFirestore(lastOrderId);
      } else if (lastOrderSnapshot) {
        // fallback to local snapshot
        try {
          const parsed = JSON.parse(lastOrderSnapshot);
          setOrder(parsed);
        } catch (err) {
          console.warn("Failed to parse lastOrder snapshot:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.warn("OrderConfirmation init error:", err);
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="checkout container">
        <div className="empty">
          <h2>Loading your order…</h2>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="checkout container">
        <div className="empty">
          <h2>No recent order found</h2>
          <p className="muted">If you just placed an order, it should appear here. Otherwise, go to shop.</p>
          {fetchError && <div className="error" style={{ marginTop: 8 }}>{fetchError}</div>}
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => navigate("/shop")}>Shop perfumes</button>
          </div>
        </div>
      </main>
    );
  }

  // some orders from Firestore may have serverTimestamp() object; try to normalize createdAt
  const createdAt = order.createdAt && typeof order.createdAt.toDate === "function"
    ? order.createdAt.toDate().toISOString()
    : order.createdAt || order.meta?.createdAt || null;

  return (
    <main className="checkout container">
      <div className="conf-card card">
        <h1>Thank you — your order is placed</h1>
        <p className="muted">Order ID: <strong>{order.id}</strong></p>
        {createdAt && <p className="muted">Placed: {new Date(createdAt).toLocaleString()}</p>}

        <section className="card">
          <h3>Order details</h3>
          <div className="summary-line">
            <div>Items</div>
            <div>{order.totalItems}</div>
          </div>
          <div className="summary-line">
            <div>Subtotal</div>
            <div>{formatPrice(order.subtotal)}</div>
          </div>
          <div className="summary-line">
            <div>Shipping</div>
            <div>{formatPrice(order.shipping || 0)}</div>
          </div>
          <div className="summary-line total">
            <div>Total</div>
            <div className="big">{formatPrice(order.total)}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Items</h4>
            <div>
              {(order.items || []).map((it, ix) => (
                <div key={ix} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <img src={it.imageUrl || "/smoke-fallback.jpg"} alt={it.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      <div className="muted small">{it.volume || ""} × {it.qty}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatPrice((it.price || 0) * (it.qty || 1))}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Shipping to</h3>
          <div>{order.customer.fullName}</div>
          <div className="muted">{order.customer.address1}{order.customer.address2 ? `, ${order.customer.address2}` : ""}</div>
          <div className="muted">{order.customer.city} {order.customer.postal}</div>
          <div className="muted">{order.customer.state} • {order.customer.country}</div>
          <div className="muted">Phone: {order.customer.phone}</div>
          <div className="muted">Email: {order.customer.email}</div>
        </section>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button className="btn primary" onClick={() => navigate("/shop")}>Continue shopping</button>
          <button className="btn ghost" onClick={() => navigate("/orders")}>View orders</button>
        </div>
      </div>
    </main>
  );
}
