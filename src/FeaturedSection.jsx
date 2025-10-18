// src/FeaturedSection.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./featured.css";
import { getFeaturedProductsRealtime, formatPrice } from "./services/productsService";
import { useNavigate } from "react-router-dom";

export default function FeaturedSection({ onAddToCart = () => {} }) {
  const [featured, setFeatured] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = getFeaturedProductsRealtime((data) => setFeatured(data));
    return () => unsub();
  }, []);

  const displayed = featured.slice(0, 3);

  return (
    <section id="featured" className="featured-section" aria-labelledby="featured-title">
      {/* Background perfume-style decorative layer */}
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
              <div className="fc-media">
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
                      onClick={() => window.alert("Quick view coming soon!")}
                    >
                      Quick view
                    </button>
                    <button className="btn small primary" onClick={() => onAddToCart(p)}>
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
