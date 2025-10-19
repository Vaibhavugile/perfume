// src/pages/CartPage.jsx
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { formatPrice } from "../services/productsService";
import "../styles/cart.css";

export default function CartPage() {
  const { items, updateQty, removeFromCart, clearCart, subtotal, totalQty } = useCart();
  const navigate = useNavigate();

  const handleQtyChange = useCallback(
    (uniqueId, raw) => {
      const parsed = parseInt(raw, 10);
      const qty = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
      updateQty(uniqueId, qty);
    },
    [updateQty]
  );

  if (!items || items.length === 0) {
    return (
      <main className="cart-page container">
        <div className="empty">
          <h2>Your cart is empty.</h2>
          <p className="muted">Add some scents to get started.</p>
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => navigate("/shop")}>Shop perfumes</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page container">
      <h1>Your cart</h1>

      <div className="cart-grid">
        <div className="cart-items">
          {items.map((it) => {
            const uid = it.uniqueId || `${it.id}-${it.volume || "50ml"}`;
            const qty = it.qty || 1;
            const lineTotal = (typeof it.price === "number" ? it.price : 0) * qty;

            return (
              <div key={uid} className="cart-item">
                <img src={it.imageUrl || "/smoke-fallback.jpg"} alt={it.name} />

                <div className="ci-body">
                  <h3>{it.name}</h3>
                  <div className="muted small">Volume: {it.volume || "50ml"}</div>
                  {it.description && <div className="muted small">{it.description}</div>}

                  <div className="ci-controls">
                    <div className="qty">
                      <button onClick={() => updateQty(uid, Math.max(1, qty - 1))}>−</button>
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => handleQtyChange(uid, e.target.value)}
                      />
                      <button onClick={() => updateQty(uid, qty + 1)}>+</button>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="btn ghost small" onClick={() => removeFromCart(uid)}>Remove</button>
                    </div>
                  </div>
                </div>

                <div className="ci-price">{formatPrice(lineTotal)}</div>
              </div>
            );
          })}
        </div>

        <aside className="cart-summary">
          <div className="summary-card">
            <div className="line">
              <div>Items</div>
              <div className="line">{totalQty}</div>
            </div>

            <div className="line">
              <div>Subtotal</div>
              <div className="line">{formatPrice(subtotal)}</div>
            </div>

            <div className="line muted">
              <div>Estimated tax</div>
              <div>—</div>
            </div>

            <div className="line total">
              <div>Total</div>
              <div className="big">{formatPrice(subtotal)}</div>
            </div>

            <div className="summary-actions">
                <button className="btn primary" onClick={() => navigate("/checkout")}>Checkout</button>

              <button className="btn ghost" onClick={() => clearCart()}>Clear cart</button>
              <button className="btn ghost" onClick={() => navigate("/shop")}>Continue shopping</button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
