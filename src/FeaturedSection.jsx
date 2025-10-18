// src/FeaturedSection.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./featured.css";
import { getFeaturedProductsRealtime, formatPrice } from "./services/productsService";
import { useNavigate } from "react-router-dom";
import { useCart } from "./contexts/CartContext";

/**
 * FeaturedSection
 * - shows up to 3 featured products
 * - useCart() for adding to cart
 * - navigate to product detail for quick view / image click
 */
export default function FeaturedSection() {
  const [featured, setFeatured] = useState([]);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    const unsub = getFeaturedProductsRealtime((data) => {
      // ensure array
      setFeatured(Array.isArray(data) ? data : []);
    });
    return () => unsub && typeof unsub === "function" && unsub();
  }, []);

  // show only 3 on homepage
  const displayed = featured.slice(0, 3);

  return (
    <section id="featured" className="featured-section" aria-labelledby="featured-title">
      {/* Decorative visual layer */}
      <div className="perfume-decor" aria-hidden="true">
        <div className="notes">
          <span className="note n1" />
          <span className="note n2" />
          <span className="note n3" />
          <span className="note n4" />
        </div>
        <div className="petals">
          <span className="petal p1" />
          <span className="petal p2" />
          <span className="petal p3" />
        </div>
        <div className="sparkles" />
      </div>

      <div className="container">
        <motion.div
          className="section-head"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
        >
          <h2 id="featured-title" className="section-title">
            Featured Collection
          </h2>
          <p className="section-sub">Handpicked scents that define the season.</p>
        </motion.div>

        <motion.div
          className="grid"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
        >
          {displayed.map((p, i) => (
            <motion.article
              key={p.id}
              className="featured-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.12 }}
              whileHover={{ translateY: -6 }}
            >
              <div
                className="fc-media"
                // click image to go to product detail
                onClick={() => navigate(`/product/${p.id}`)}
                style={{ cursor: "pointer" }}
              >
                <motion.img
                  src={p.imageUrl || "/smoke-fallback.jpg"}
                  alt={p.name}
                  loading="lazy"
                  className="fc-img"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.35 }}
                />
                <div className="img-shimmer" aria-hidden="true" />
              </div>

              <div className="fc-body">
                <h3>{p.name}</h3>
                <p className="muted small">{p.description}</p>

                <div className="fc-foot">
                  <div className="price">{formatPrice(p.price)}</div>
                  <div className="fc-actions">
                    <button
                      className="btn small ghost"
                      onClick={() => navigate(`/product/${p.id}`)}
                      aria-label={`View ${p.name}`}
                    >
                      View
                    </button>

                    <button
                      className="btn small primary"
                      onClick={() => addToCart(p, 1)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          className="view-all"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <button className="btn ghost" onClick={() => navigate("/shop")}>
            View All →
          </button>
        </motion.div>
      </div>
    </section>
  );
}
