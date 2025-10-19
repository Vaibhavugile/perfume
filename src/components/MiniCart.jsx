// src/components/MiniCart.jsx
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../contexts/CartContext";
import { formatPrice } from "../services/productsService";
import { useNavigate } from "react-router-dom";
import "./mini-cart.css";

export default function MiniCart() {
  const {
    items,
    isMiniOpen,
    closeMini,
    updateQty,
    removeFromCart,
    subtotal,
    totalQty,
  } = useCart();
  const navigate = useNavigate();

  // close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeMini();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMini]);

  return (
    <AnimatePresence>
      {isMiniOpen && (
        <>
          <motion.div
            className="mc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            onClick={() => closeMini()}
          />

          <motion.aside
            className="mini-cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="Mini cart"
          >
            <div className="mc-header">
              <div>
                <h3 className="mc-title">Your Cart</h3>
                <div className="mc-subtitle muted">Items: {totalQty}</div>
              </div>

              <button
                className="mc-close"
                onClick={() => closeMini()}
                aria-label="Close mini cart"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mc-list">
              {items.length === 0 ? (
                <div className="mc-empty">Your cart is empty</div>
              ) : (
                items.map((it) => {
                  const uid = it.uniqueId || `${it.id}-${it.volume || "50ml"}`;
                  const qty = it.qty || 1;
                  const unitPrice = typeof it.price === "number" ? it.price : 0;
                  const lineTotal = unitPrice * qty;

                  return (
                    <div className="mc-item" key={uid}>
                      <img
                        className="mc-thumb"
                        src={it.imageUrl || "/smoke-fallback.jpg"}
                        alt={it.name}
                      />

                      <div className="mc-meta">
                        <div className="mc-name">{it.name}</div>
                        <div className="muted small">
                          {it.volume || "50ml"} • {formatPrice(unitPrice)} each
                        </div>

                        <div className="mc-controls">
                          <div className="qty-controls">
                            <button
                              className="qty-btn"
                              aria-label="Decrease quantity"
                              onClick={() => updateQty(uid, Math.max(1, qty - 1))}
                            >
                              −
                            </button>

                            <input
                              className="qty-input"
                              type="number"
                              min={1}
                              value={qty}
                              onChange={(e) =>
                                updateQty(
                                  uid,
                                  Math.max(1, parseInt(e.target.value || "1", 10))
                                )
                              }
                              aria-label="Quantity"
                            />

                            <button
                              className="qty-btn"
                              aria-label="Increase quantity"
                              onClick={() => updateQty(uid, qty + 1)}
                            >
                              +
                            </button>
                          </div>

                          <button
                            className="mc-remove"
                            aria-label="Remove item"
                            onClick={() => removeFromCart(uid)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mc-line">
                        <div className="mc-line-price">{formatPrice(lineTotal)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mc-footer">
              <div className="mc-sub">
                <div className="muted">Subtotal</div>
                <div className="bold">{formatPrice(subtotal)}</div>
              </div>

              <div className="mc-actions">
                <button
                  className="btn ghost"
                  onClick={() => {
                    closeMini();
                    navigate("/shop");
                  }}
                >
                  Continue shopping
                </button>

                <button
                  className="btn primary mc-go"
                  onClick={() => {
                    closeMini();
                    navigate("/cart");
                  }}
                >
                  Go to Cart
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
