// src/QuickView.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./quickview.css";
import { formatPrice } from "./services/productsService";

export default function QuickView({ product, onClose = () => {}, onAddToCart = () => {}, emitterRef = null, initialSelectedVolume = null }) {
  // Hooks must run regardless of product being null
  // compute a safe volumes array from product (may be undefined if product is null)
  const safePrices = (product && product.prices && Array.isArray(product.prices) && product.prices.length > 0)
    ? product.prices
    : product && product.price
    ? [{ volume: "50ml", price: product.price }]
    : [];

  // default selection preference: use initialSelectedVolume if provided, else prefer 50ml if available, else first
  const chooseDefault = () => {
    if (initialSelectedVolume) return initialSelectedVolume;
    if (safePrices.some((v) => v.volume === "50ml")) return "50ml";
    return safePrices[0] ? safePrices[0].volume : "50ml";
  };

  const [selectedVolume, setSelectedVolume] = useState(chooseDefault());

  useEffect(() => {
    // reset selection when product changes
    setSelectedVolume(chooseDefault());
    // still run on product id change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, initialSelectedVolume]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!product) return null;

  const volumes = safePrices;
  const selectedPriceObj = volumes.find((v) => v.volume === selectedVolume) || volumes[0] || { price: product.price || 0, volume: selectedVolume };

  const buildVariant = () => ({
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl || product.image,
    price: selectedPriceObj.price,
    volume: selectedPriceObj.volume,
    uniqueId: `${product.id}-${selectedPriceObj.volume}`,
  });

  return (
    <motion.div
      className="qv-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
        <div className="qv-left" ref={emitterRef}>
          <img className="qv-bottle" src={product.image || product.imageUrl || "/smoke-fallback.jpg"} alt={product.name} />
        </div>

        <div className="qv-right">
          <h2>{product.name}</h2>
          <p className="muted small">{product.description}</p>

          <div className="qv-notes">
            <strong>Notes</strong>
            <div className="notes-grid">
              {(product.notes || []).length > 0
                ? (product.notes || []).map((n, idx) => (
                    <div key={idx} className="note-pill">
                      {n}
                    </div>
                  ))
                : ["Top: Bergamot", "Heart: Jasmine", "Base: Musk"].map((n, idx) => (
                    <div key={idx} className="note-pill">
                      {n}
                    </div>
                  ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              <strong>Choose volume</strong>
            </label>
            {volumes && volumes.length > 0 ? (
              <select value={selectedVolume} onChange={(e) => setSelectedVolume(e.target.value)}>
                {volumes.map((v) => (
                  <option key={v.volume} value={v.volume}>
                    {v.volume} — {formatPrice(v.price)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="muted small">50ml</div>
            )}
          </div>

          <div className="qv-actions" style={{ marginTop: 18 }}>
            <div className="qv-price">{formatPrice(selectedPriceObj.price)}</div>
            <div className="qv-buttons">
              <button className="btn ghost" onClick={onClose}>
                Close
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  onAddToCart(buildVariant());
                  onClose();
                }}
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
