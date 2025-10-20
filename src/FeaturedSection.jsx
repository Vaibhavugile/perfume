import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./featured.css";
import { getFeaturedProductsRealtime, formatPrice } from "./services/productsService";
import { useNavigate } from "react-router-dom";
import { useCart } from "./contexts/CartContext";

/**
 * FeaturedSection
 * - shows up to 3 featured products
 * - useCart() for adding to cart
 * - navigate to product detail for quick view / image click
 *
 * Each featured card now supports multiple images (product.images array) and
 * automatically animates between them with Framer Motion. Hovering a card pauses
 * autoplay. Thumbnails allow manual selection.
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
            <FeaturedCard
              key={p.id}
              product={p}
              index={i}
              onView={() => navigate(`/product/${p.id}`)}
              onAdd={() => addToCart(p, 1)}
            />
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

function FeaturedCard({ product, index = 0, onView = () => {}, onAdd = () => {} }) {
  // images array (fallback to legacy single URL)
  const imgs = Array.isArray(product?.images) && product.images.length > 0
    ? product.images
    : product?.imageUrl ? [product.imageUrl] : ["/smoke-fallback.jpg"];

  const [active, setActive] = useState(0);
  const [isHover, setIsHover] = useState(false);
  const timerRef = useRef(null);
  const AUTOPLAY_MS = 3200;

  useEffect(() => {
    if (isHover) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    // start autoplay
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setActive((a) => (a + 1) % imgs.length);
      }, AUTOPLAY_MS);
    }

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [imgs.length, isHover]);

  const showAt = (i) => {
    setActive(i % imgs.length);
  };

  const priceValue = (() => {
    // if product.prices array exists, prefer showing the smallest volume price or first one
    if (Array.isArray(product?.prices) && product.prices.length > 0) return product.prices[0].price;
    return product?.price || 0;
  })();

  return (
    <motion.article
      className="featured-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.12 }}
      whileHover={{ translateY: -6 }}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div className="fc-media" style={{ cursor: "pointer" }} onClick={onView}>
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={`${product.id}-${active}`}
            src={imgs[active]}
            alt={`${product.name} - ${active + 1}`}
            className="fc-img"
            initial={{ opacity: 0, y: 8, scale: 1.03 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.55 }}
            loading="lazy"
          />
        </AnimatePresence>
        <div className="img-shimmer" aria-hidden="true" />

        {imgs.length > 1 && (
          <div className="thumb-row">
            {imgs.slice(0, 5).map((src, idx) => (
              <button
                key={idx}
                className={`thumb-btn ${active === idx ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); showAt(idx); }}
                aria-label={`Show image ${idx + 1} for ${product.name}`}
                style={{ backgroundImage: `url(${src})` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fc-body">
        <h3>{product.name}</h3>
        <p className="muted small">{product.description}</p>

        <div className="fc-foot">
          <div className="price">{formatPrice(priceValue)}</div>
          <div className="fc-actions">
            <button className="btn small ghost" onClick={onView} aria-label={`View ${product.name}`}>
              View
            </button>
            <button className="btn small primary" onClick={onAdd}>
              Add
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}