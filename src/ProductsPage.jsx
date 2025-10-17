// src/pages/ProductsPage.jsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import "./products.css";
import { getProducts, formatPrice, getAllTags } from "./data/products";
import QuickView from "./QuickView"; // optional - reuse if present
import ScentEmitter from "./ScentEmitter"; // optional - reuse if present

export default function ProductsPage({ onAddToCart = () => {} }) {
  const all = useMemo(() => getProducts(), []);
  const allTags = useMemo(() => getAllTags(), []);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [sortBy, setSortBy] = useState("featured"); // featured | price-asc | price-desc | name
  const [visible, setVisible] = useState(6);
  const [quickProduct, setQuickProduct] = useState(null);
  const [hoveredBottleId, setHoveredBottleId] = useState(null);
  const [hoveredRef, setHoveredRef] = useState(null);

  // filtering
  const filtered = all
    .filter((p) => (activeTag ? (p.tags || []).includes(activeTag) : true))
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || (p.description || "").toLowerCase().includes(query.toLowerCase()));

  // sorting
  filtered.sort((a, b) => {
    if (sortBy === "featured") return (b.featured === true) - (a.featured === true);
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  const visibleItems = filtered.slice(0, visible);

  return (
    <main className="products-page">
      <header className="products-hero">
        <div className="container">
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>All Perfumes</motion.h1>
          <p className="muted">Browse the full collection — filter by mood, notes, or price.</p>

          <div className="products-controls">
            <div className="search-wrap">
              <input placeholder="Search perfumes, notes, descriptions..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="filters">
              <select value={activeTag} onChange={(e) => setActiveTag(e.target.value)}>
                <option value="">All moods & families</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-asc">Price — low to high</option>
                <option value="price-desc">Price — high to low</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <section className="products-grid container">
        {visibleItems.length === 0 ? (
          <div className="empty">No products match — try clearing filters or search.</div>
        ) : (
          visibleItems.map((p) => (
            <motion.article
              key={p.id}
              className="product-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onMouseEnter={(e) => {
                setHoveredBottleId(p.id);
                setHoveredRef(e.currentTarget.querySelector(".pc-media img"));
              }}
              onMouseLeave={() => {
                setHoveredBottleId(null);
                setHoveredRef(null);
              }}
            >
              <div className="pc-media">
                <img src={p.image || "/smoke-fallback.jpg"} alt={p.name} />
                <div className="pc-badge">{p.featured ? "Featured" : ""}</div>
              </div>

              <div className="pc-body">
                <h3>{p.name}</h3>
                <p className="muted small">{p.description}</p>

                <div className="pc-foot">
                  <div className="price">{formatPrice(p.price)}</div>
                  <div className="actions">
                    <button className="btn small ghost" onClick={() => setQuickProduct(p)}>Quick view</button>
                    <button className="btn small primary" onClick={() => onAddToCart(p)}>Add</button>
                  </div>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </section>

      <div className="container actions-row">
        {visible < filtered.length ? (
          <button className="btn ghost" onClick={() => setVisible((s) => s + 6)}>Load more</button>
        ) : filtered.length > 0 ? (
          <div className="muted">End of collection</div>
        ) : null}
      </div>

      {/* hovered bottle emitter */}
      {hoveredRef && hoveredBottleId && (
        <ScentEmitter targetRef={{ current: hoveredRef }} colors={["rgba(200,110,220,0.9)"]} density={10} size={[6, 22]} enabled={true} />
      )}

      {/* quick view */}
      {quickProduct && (
        <QuickView product={quickProduct} onClose={() => setQuickProduct(null)} onAddToCart={(p) => { onAddToCart(p); setQuickProduct(null); }} />
      )}
    </main>
  );
}
