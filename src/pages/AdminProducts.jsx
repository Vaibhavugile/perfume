// src/pages/AdminProducts.jsx (MOBILE-FRIENDLY + SEARCH)
import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProductsRealtime,
  deleteProduct,
  deleteImageByPath,
} from "../services/productsService";
import ProductForm from "../components/ProductForm";
import "../styles/adminProducts.css";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const unsub = getProductsRealtime((arr) => setProducts(Array.isArray(arr) ? arr : []));
    return () => unsub && typeof unsub === "function" && unsub();
  }, []);

  // simple client-side search (name, description, tags)
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const desc = String(p.description || "").toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.join(" ").toLowerCase() : String(p.tags || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || tags.includes(q);
    });
  }, [products, query]);

  return (
    <main className="admin-products-page">
      <header className="admin-header">
        <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}>
          <h1 style={{ flex: "0 0 auto" }}>Manage Products</h1>

          {/* Search bar (takes remaining space) */}
          <div style={{ flex: "1 1 360px", display: "flex", justifyContent: "flex-end" }}>
            <input
              aria-label="Search products"
              placeholder="Search by name, description or tags..."
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            className="btn primary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            style={{ marginLeft: 12, flex: "0 0 auto" }}
          >
            + Add Product
          </button>
        </div>
      </header>

      <section className="admin-products-grid">
        {filtered.length === 0 && <p className="muted small">No products match your search.</p>}

        {filtered.map((p) => (
          <motion.div key={p.id} className="admin-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="admin-card-media">
              <AdminMedia product={p} />
            </div>

            <div className="admin-card-body">
              <div>
                <h3>{p.name}</h3>
                <p className="muted small">{p.description}</p>
                <div className="muted tiny">Tags: {(p.tags || []).join(", ")}</div>

                <div className="admin-prices">
                  {Array.isArray(p.prices) && p.prices.length > 0 ? (
                    <div className="price-grid">
                      {p.prices.map((pr) => (
                        <div key={pr.volume} className="price-item">
                          <div className="vol">{pr.volume}</div>
                          <div className="amt">₹{(pr.price / 100).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="price-item">
                      <div className="vol">50ml</div>
                      <div className="amt">{p.price ? `₹${(p.price / 100).toFixed(2)}` : "N/A"}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-card-actions">
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn ghost small danger"
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete \"${p.name}\"?`)) {
                      try {
                        if (p._imagePaths && Array.isArray(p._imagePaths)) {
                          for (const path of p._imagePaths) {
                            try {
                              await deleteImageByPath(path);
                            } catch (e) {
                              /* ignore */
                            }
                          }
                        }
                        await deleteProduct(p.id);
                      } catch (err) {
                        console.error("Failed to delete product", err);
                        alert("Failed to delete product: " + (err.message || err));
                      }
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <AnimatePresence>
        {showForm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.28 }}>
              <ProductForm
                product={editing}
                onSaved={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function AdminMedia({ product }) {
  const imgs = Array.isArray(product?.images) && product.images.length > 0 ? product.images : product?.imageUrl ? [product.imageUrl] : ["/smoke-fallback.jpg"];
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (hover || imgs.length <= 1) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => setActive((a) => (a + 1) % imgs.length), 3000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [imgs.length, hover]);

  return (
    <div className="admin-media" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <motion.img key={`${product.id}-${active}`} src={imgs[active]} alt={product.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.45 }} />
      {imgs.length > 1 && (
        <div className="thumb-row small">
          {imgs.slice(0, 5).map((s, idx) => (
            <button key={idx} className={`thumb-btn ${active === idx ? "active" : ""}`} onClick={() => setActive(idx)} style={{ backgroundImage: `url(${s})` }} aria-label={`show ${idx + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}
