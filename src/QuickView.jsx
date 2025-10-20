// src/QuickView.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./quickview.css";
import { formatPrice } from "./services/productsService";

export default function QuickView({
  product,
  onClose = () => {},
  onAddToCart = () => {},
  emitterRef = null,
  initialSelectedVolume = null,
}) {
  const safePrices =
    product && product.prices && Array.isArray(product.prices) && product.prices.length > 0
      ? product.prices
      : product && product.price
      ? [{ volume: "50ml", price: product.price }]
      : [];

  const chooseDefault = () => {
    if (initialSelectedVolume) return initialSelectedVolume;
    if (safePrices.some((v) => v.volume === "50ml")) return "50ml";
    return safePrices[0] ? safePrices[0].volume : "50ml";
  };

  const [selectedVolume, setSelectedVolume] = useState(chooseDefault());

  useEffect(() => {
    setSelectedVolume(chooseDefault());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, initialSelectedVolume]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!product) return null;

  const volumes = safePrices;
  const selectedPriceObj =
    volumes.find((v) => v.volume === selectedVolume) ||
    volumes[0] ||
    { price: product.price || 0, volume: selectedVolume };

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
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
          <img
            className="qv-bottle"
            src={product.image || product.imageUrl || "/smoke-fallback.jpg"}
            alt={product.name}
          />
        </div>

        <div className="qv-right">
          <h2>{product.name}</h2>
          <p className="muted small">{product.description}</p>

          <div className="qv-notes">
            <strong>Notes</strong>
            <div className="notes-grid">
              {(product.notes || []).length > 0
                ? product.notes.map((n, idx) => (
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

          <div className="qv-volume">
            <label>
              <strong>Choose volume</strong>
            </label>
            {volumes && volumes.length > 0 ? (
              <div className="qv-select-wrap">
                <select
                  value={selectedVolume}
                  onChange={(e) => setSelectedVolume(e.target.value)}
                >
                  {volumes.map((v) => (
                    <option key={v.volume} value={v.volume}>
                      {v.volume} — {formatPrice(v.price)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="muted small">50ml</div>
            )}
          </div>

          <div className="qv-actions">
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
