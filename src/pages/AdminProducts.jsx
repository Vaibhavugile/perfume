// src/pages/AdminProducts.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProductsRealtime,
  deleteProduct,
} from "../services/productsService";
import ProductForm from "../components/ProductForm";
import "../styles/adminProducts.css";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsub = getProductsRealtime((arr) => setProducts(arr));
    return () => unsub();
  }, []);

  return (
    <main className="admin-products-page">
      <header className="admin-header">
        <h1>Manage Products</h1>
        <button
          className="btn primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + Add Product
        </button>
      </header>

      <section className="admin-products-grid">
        {products.length === 0 && (
          <p className="muted small">No products added yet.</p>
        )}
        {products.map((p) => (
          <motion.div
            key={p.id}
            className="admin-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="admin-card-media">
              <img
                src={p.imageUrl || "/smoke-fallback.jpg"}
                alt={p.name}
                loading="lazy"
              />
            </div>
            <div className="admin-card-body">
              <h3>{p.name}</h3>
              <p className="muted small">{p.description}</p>
              <div className="muted tiny">
                Tags: {(p.tags || []).join(", ")}
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
                    if (
                      window.confirm(`Are you sure you want to delete "${p.name}"?`)
                    ) {
                      await deleteProduct(p.id);
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

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
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
