// src/components/MiniCart.jsx
import React, { useEffect, useState, useCallback } from "react";
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

  // Detect mobile breakpoint (matches CSS @media max-width:640px)
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth <= 640);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeMini();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMini]);

  // Prevent background scroll when mini cart is open
  useEffect(() => {
    if (isMiniOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    }
    return;
  }, [isMiniOpen]);

  // Motion variants differ by device
  const desktopVariants = {
    hidden: { x: "100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  };

  const mobileVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  };

  // Choose drag axis only on mobile to allow swipe-to-dismiss
  const dragProps = isMobile
    ? {
        drag: "y",
        dragConstraints: { top: 0, bottom: 0 }, // allow free vertical drag
        dragElastic: 0.3,
        onDragEnd: (e, info) => {
          // if dragged down more than 120px or fast in downward direction — close
          if (info.offset.y > 120 || info.velocity.y > 700) {
            closeMini();
          }
        },
      }
    : {};

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
            aria-hidden="true"
          />

          <motion.aside
            className="mini-cart"
            role="dialog"
            aria-modal="true"
            aria-label="Mini cart"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={isMobile ? mobileVariants : desktopVariants}
            transition={{ type: "spring", stiffness: isMobile ? 260 : 300, damping: isMobile ? 25 : 30 }}
            {...dragProps}
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
                          <div className="qty-controls" role="group" aria-label={`Quantity controls for ${it.name}`}>
                            <button
                              className="qty-btn"
                              aria-label={`Decrease quantity of ${it.name}`}
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
                              aria-label={`Quantity for ${it.name}`}
                            />

                            <button
                              className="qty-btn"
                              aria-label={`Increase quantity of ${it.name}`}
                              onClick={() => updateQty(uid, qty + 1)}
                            >
                              +
                            </button>
                          </div>

                          <button
                            className="mc-remove"
                            aria-label={`Remove ${it.name}`}
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
