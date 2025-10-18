// src/pages/CartPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { formatPrice } from "../services/productsService";
import "../styles/cart.css";

export default function CartPage() {
  const { items, updateQty, removeFromCart, clearCart, subtotal } = useCart();
  const navigate = useNavigate();

  if (!items || items.length === 0) {
    return (
      <main className="cart-page container">
        <div className="empty">Your cart is empty.</div>
      </main>
    );
  }

  return (
    <main className="cart-page container">
      <h1>Your cart</h1>
      <div className="cart-grid">
        <div className="cart-items">
          {items.map((it) => (
            <div key={it.id} className="cart-item">
              <img src={it.imageUrl || "/smoke-fallback.jpg"} alt={it.name} />
              <div className="ci-body">
                <h3>{it.name}</h3>
                <div className="muted small">{it.description}</div>
                <div className="ci-controls">
                  <div className="qty">
                    <button onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))}>−</button>
                    <input value={it.qty} onChange={(e) => updateQty(it.id, Math.max(1, parseInt(e.target.value || 1)))} />
                    <button onClick={() => updateQty(it.id, it.qty + 1)}>+</button>
                  </div>
                  <button className="btn ghost small" onClick={() => removeFromCart(it.id)}>Remove</button>
                </div>
              </div>
              <div className="ci-price">{formatPrice(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        <aside className="cart-summary">
          <div className="summary-card">
            <div className="line">
              <div>Subtotal</div>
              <div className="bold">{formatPrice(subtotal)}</div>
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
              <button className="btn primary" onClick={() => alert("Checkout flow not implemented")}>Checkout</button>
              <button className="btn ghost" onClick={() => clearCart()}>Clear cart</button>
              <button className="btn ghost" onClick={() => navigate("/shop")}>Continue shopping</button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
