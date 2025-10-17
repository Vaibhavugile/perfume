// src/FeaturedSection.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import "./featured.css";
import { getFeaturedProducts, formatPrice } from "./data/products";
import { useNavigate } from "react-router-dom";
/**
 * FeaturedSection (perfume-themed animations without smoke)
 * - drifting scent notes (CSS shapes)
 * - floating petals (CSS shapes)
 * - subtle sparkle particles
 * - shimmer sweep on product images
 *
 * Props:
 *  - onAddToCart(product)
 */
export default function FeaturedSection({ onAddToCart = () => {} }) {
  const featured = getFeaturedProducts();
  const [showAll, setShowAll] = useState(false);
const navigate = useNavigate();
  // show only first 3 unless showAll is true
  const displayed = showAll ? featured : featured.slice(0, 3);

  return (
    <section id="featured" className="featured-section" aria-labelledby="featured-title">
      {/* Decorative visual layer: scent notes + petals + particles */}
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
        {/* Why cards on top */}
        <motion.div
          className="why-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="why-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <div className="why-ico">🧪</div>
            <div>
              <h4>Crafted with care</h4>
              <p className="muted small">Small-batch formulas blended by our master perfumer.</p>
            </div>
          </motion.div>

          <motion.div className="why-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <div className="why-ico">🌿</div>
            <div>
              <h4>Natural extracts</h4>
              <p className="muted small">Botanical and premium oils for longevity and clarity.</p>
            </div>
          </motion.div>

          <motion.div className="why-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <div className="why-ico">♻️</div>
            <div>
              <h4>Sustainable</h4>
              <p className="muted small">Recyclable packaging and refill program supported.</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Section header */}
        <motion.div className="section-head" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <h2 id="featured-title" className="section-title">Featured Collection</h2>
          <p className="section-sub">Handpicked scents that define the season.</p>
        </motion.div>

        {/* Grid of featured items */}
        <motion.div className="grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
          {displayed.map((p, i) => (
            <motion.article
              key={p.id}
              className="featured-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.12, duration: 0.6 }}
              whileHover={{ translateY: -6 }}
            >
              <div className="fc-media">
                <motion.img
                  src={p.image}
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
                    <button className="btn small ghost" onClick={() => window.alert("Quick view — modal later")}>Quick view</button>
                    <button className="btn small primary" onClick={() => onAddToCart(p)}>Add</button>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        {/* View all / Show less toggle */}
        <motion.div
  className="view-all"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.9 }}
>
  <button
    className="btn ghost"
     onClick={() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate("/shop");
  }}
    aria-label="View all perfumes"
  >
    View All →
  </button>
</motion.div>

      </div>
    </section>
  );
}
