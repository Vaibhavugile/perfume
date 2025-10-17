// src/QuickView.jsx
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import "./quickview.css";

/**
 * QuickView modal
 * Props:
 *  - product: product object (or null to close)
 *  - onClose: function
 *  - onAddToCart: function(product)
 *  - emitterRef: optional ref to attach ScentEmitter to (for large effect)
 */
export default function QuickView({ product, onClose = () => {}, onAddToCart = () => {}, emitterRef = null }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!product) return null;

  return (
    <motion.div
      className="qv-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="qv-panel"
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 10, opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label={`${product.name} details`}
      >
        <div className="qv-left" ref={emitterRef /* optional target for ScentEmitter */}>
          <img className="qv-bottle" src={product.image || "/smoke-fallback.jpg"} alt={product.name} />
        </div>

        <div className="qv-right">
          <h2>{product.name}</h2>
          <p className="muted small">{product.description}</p>

          <div className="qv-notes">
            <strong>Notes</strong>
            <div className="notes-grid">
              {/* If product has notes array (optional) */}
              {(product.notes || ["Top: Bergamot","Heart: Jasmine","Base: Musk"]).map((n, idx) => (
                <div key={idx} className="note-pill">{n}</div>
              ))}
            </div>
          </div>

          <div className="qv-actions">
            <div className="qv-price">{product.price ? `₹${(product.price/100).toFixed(2)}` : ""}</div>
            <div className="qv-buttons">
              <button className="btn ghost" onClick={onClose}>Close</button>
              <button className="btn primary" onClick={() => { onAddToCart(product); onClose(); }}>Add to cart</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
