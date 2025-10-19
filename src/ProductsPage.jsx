// src/ProductsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import "./products.css";
import { getProductsRealtime, formatPrice } from "./services/productsService";
import { useCart } from "./contexts/CartContext";
import { useNavigate } from "react-router-dom";
import QuickView from "./QuickView";

const buildVariant = (product, volume) => {
  const fallback = {
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl || product.image,
    price: product.price || 0,
    volume: volume || "50ml",
    uniqueId: `${product.id}-${volume || "50ml"}`,
  };

  if (!product?.prices || product.prices.length === 0) return fallback;

  const p = product.prices.find((x) => x.volume === volume) || product.prices[0];
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl || product.image,
    price: p.price,
    volume: p.volume,
    uniqueId: `${product.id}-${p.volume}`,
  };
};

export default function ProductsPage() {
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [visible, setVisible] = useState(6);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  // map of productId -> selectedVolume
  const [selectedVolumes, setSelectedVolumes] = useState({});

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = getProductsRealtime((arr) => setAll(Array.isArray(arr) ? arr : []));
    return () => unsub && typeof unsub === "function" && unsub();
  }, []);

  // initialize selectedVolumes whenever products load (only sets defaults for new products)
  useEffect(() => {
    if (!all || all.length === 0) return;
    setSelectedVolumes((prev) => {
      const next = { ...prev };
      all.forEach((p) => {
        if (next[p.id]) return; // keep existing selection
        // choose 50ml if present, otherwise first price or fallback
        const defaultVolume =
          p.prices && p.prices.some((x) => x.volume === "50ml")
            ? "50ml"
            : p.prices && p.prices.length > 0
            ? p.prices[0].volume
            : "50ml";
        next[p.id] = defaultVolume;
      });
      return next;
    });
  }, [all]);

  const allTags = useMemo(() => {
    const tagsSet = new Set();
    all.forEach((p) => (p.tags || []).forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [all]);

  const filtered = all
    .filter((p) => (activeTag ? (p.tags || []).includes(activeTag) : true))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(query.toLowerCase())
    );

  filtered.sort((a, b) => {
    if (sortBy === "featured") return (b.featured === true) - (a.featured === true);
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  const visibleItems = filtered.slice(0, visible);

  const handleVolumeChange = (productId, volume) => {
    setSelectedVolumes((prev) => ({ ...prev, [productId]: volume }));
  };

  return (
    <main className="products-page">
      <header className="products-hero">
        <div className="container">
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            All Perfumes
          </motion.h1>
          <p className="muted">Discover all our scents — search, filter, or sort by your mood.</p>

          <div className="products-controls">
            <div className="search-wrap">
              <input placeholder="Search perfumes, notes, or descriptions..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="filters">
              <select value={activeTag} onChange={(e) => setActiveTag(e.target.value)}>
                <option value="">All moods & families</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
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
          visibleItems.map((p) => {
            const defaultVolume =
              p.prices && p.prices.some((x) => x.volume === "50ml")
                ? "50ml"
                : p.prices && p.prices[0]
                ? p.prices[0].volume
                : "50ml";

            const selVol = selectedVolumes[p.id] || defaultVolume;
            const variant = buildVariant(p, selVol);

            return (
              <motion.article
                key={p.id}
                className="product-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className="pc-media"
                  onClick={() => setQuickViewProduct({ ...p, selectedVolume: selVol, image: p.image || p.imageUrl })}
                  style={{ cursor: "pointer" }}
                >
                  <img src={p.imageUrl || p.image || "/smoke-fallback.jpg"} alt={p.name} loading="lazy" />
                  {p.featured && <div className="pc-badge">Featured</div>}
                </div>

                <div className="pc-body">
                  <h3>{p.name}</h3>
                  <p className="muted small">{p.description}</p>

                  <div className="pc-foot">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {p.prices && p.prices.length > 0 ? (
                        <select value={selVol} onChange={(e) => handleVolumeChange(p.id, e.target.value)}>
                          {p.prices.map((pr) => (
                            <option key={pr.volume} value={pr.volume}>
                              {pr.volume}:{formatPrice(pr.price)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="muted small">50ml</div>
                      )}

                      {/* <div className="price" style={{ marginLeft: 8 }}>
                        {formatPrice(variant.price)}
                        <span className="muted small"> ({variant.volume})</span>
                      </div> */}
                    </div>

                   <div className="actions vertical">
  <button
    className="btn small primary"
    onClick={() => addToCart(variant, 1)}
  >
    Add to Cart
  </button>
  <button
    className="btn small ghost view-btn"
    onClick={() =>
      setQuickViewProduct({
        ...p,
        selectedVolume: selVol,
        image: p.image || p.imageUrl,
      })
    }
  >
    View Details
  </button>
</div>

                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </section>

      <div className="container actions-row">
        {visible < filtered.length ? (
          <button className="btn ghost" onClick={() => setVisible((s) => s + 6)}>
            Load More
          </button>
        ) : filtered.length > 0 ? (
          <div className="muted">End of collection</div>
        ) : null}
      </div>

      {quickViewProduct && (
        <QuickView
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={(variant) => addToCart(variant, 1)}
          // initialSelectedVolume: let QuickView initialize to product.selectedVolume if provided
          initialSelectedVolume={quickViewProduct.selectedVolume}
        />
      )}
    </main>
  );
}
