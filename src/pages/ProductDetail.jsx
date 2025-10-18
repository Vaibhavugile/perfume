import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductById, formatPrice, getProductsRealtime } from "../services/productsService";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../contexts/CartContext";
import "../styles/productDetail.css";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  // Gallery state
  const [images, setImages] = useState([]); // array of URLs
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // expanded description
  const [descExpanded, setDescExpanded] = useState(false);

  // wishlist
  const [wishlisted, setWishlisted] = useState(false);

  // reviews (placeholder for now)
  const [reviews, setReviews] = useState([]);

  // related products
  const [related, setRelated] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const containerRef = useRef(null);
  const startXRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProductById(id)
      .then((p) => {
        if (!mounted) return;
        setProduct(p);
        // images
        const imgs = Array.isArray(p?.images) && p.images.length > 0
          ? p.images
          : p?.imageUrl
            ? [p.imageUrl]
            : ["/smoke-fallback.jpg"];
        setImages(imgs);
        setIndex(0);

        // load wishlist state from localStorage
        try {
          const saved = JSON.parse(localStorage.getItem("wishlist_v1") || "[]");
          setWishlisted(saved.includes(p.id));
        } catch (e) {
          /* ignore */
        }

        // mock reviews if product.reviews exists use it
        setReviews(p.reviews || [
          // fallback sample reviews (feel free to replace with real)
          { id: "r1", name: "Asha", rating: 5, text: "Lovely scent — lasts all day." },
          { id: "r2", name: "Rahul", rating: 4, text: "Great projection, a bit strong at first." },
        ]);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, [id]);

  // realtime all products (used to compute related)
  useEffect(() => {
    const unsub = getProductsRealtime((arr) => {
      if (!Array.isArray(arr)) return setAllProducts([]);
      setAllProducts(arr);
    });
    return () => unsub && typeof unsub === "function" && unsub();
  }, []);

  // compute related products by shared tags, exclude self
  useEffect(() => {
    if (!product || allProducts.length === 0) {
      setRelated([]);
      return;
    }
    const tags = new Set(product.tags || []);
    // prefer products that share tags
    const candidates = allProducts
      .filter((p) => p.id !== product.id)
      .map((p) => {
        const shared = (p.tags || []).filter((t) => tags.has(t)).length;
        return { p, shared, featured: !!p.featured };
      })
      .sort((a, b) => {
        if (b.shared !== a.shared) return b.shared - a.shared;
        if (b.featured !== a.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return b.p.createdAt ? new Date(b.p.createdAt) - new Date(a.p.createdAt) : 0;
      })
      .slice(0, 6)
      .map((x) => x.p);

    // if not enough, fallback to featured / newest
    if (candidates.length < 4) {
      const fallback = allProducts
        .filter((p) => p.id !== product.id && !candidates.find((c) => c.id === p.id))
        .sort((a, b) => ((b.featured === true) - (a.featured === true)) || 0)
        .slice(0, 6 - candidates.length);
      setRelated([...candidates, ...fallback]);
    } else {
      setRelated(candidates);
    }
  }, [product, allProducts]);

  // keyboard arrow navigation
  useEffect(() => {
    function onKey(e) {
      if (!product) return;
      if (lightboxOpen && e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, index, images, lightboxOpen]);

  const handlePrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  // simple touch/mouse swipe handlers for the large image
  function onPointerDown(e) {
    isDraggingRef.current = true;
    startXRef.current = e.clientX ?? (e.touches && e.touches[0].clientX);
  }
  function onPointerMove(e) {
    if (!isDraggingRef.current || startXRef.current == null) return;
    // reserved for subtle drag UX, not necessary right now
  }
  function onPointerUp(e) {
    if (!isDraggingRef.current) return;
    const endX = e.clientX ?? (e.changedTouches && e.changedTouches[0].clientX);
    const delta = endX - startXRef.current;
    isDraggingRef.current = false;
    startXRef.current = null;
    const THRESH = 40; // px
    if (delta > THRESH) {
      handlePrev();
    } else if (delta < -THRESH) {
      handleNext();
    }
  }

  function toggleWishlist() {
    try {
      const key = "wishlist_v1";
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      let next;
      if (!product) return;
      if (saved.includes(product.id)) {
        next = saved.filter((s) => s !== product.id);
        setWishlisted(false);
      } else {
        next = [...saved, product.id];
        setWishlisted(true);
      }
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.error("wishlist error", e);
    }
  }

  function handleShare(platform) {
    const url = window.location.href;
    const text = `${product.name} — ${product.description || ""}`;
    if (platform === "copy") {
      navigator.clipboard?.writeText(url);
      alert("Link copied to clipboard");
      return;
    }
    let shareUrl = "";
    if (platform === "twitter") {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    } else if (platform === "facebook") {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === "whatsapp") {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  if (loading) return <div className="pd-empty">Loading…</div>;
  if (!product) return <div className="pd-empty">Product not found.</div>;

  return (
    <main className="product-detail container">
      <div className="pd-ambient" aria-hidden="true" />

      <nav className="pd-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link> <span>›</span> <span>{product.name}</span>
      </nav>

      <div className="pd-grid" ref={containerRef}>
        {/* Left: gallery */}
        <div className="pd-media">
          <div
            className="gallery-card"
            onPointerDown={(e) => onPointerDown(e)}
            onPointerMove={(e) => onPointerMove(e)}
            onPointerUp={(e) => onPointerUp(e)}
            onTouchStart={(e) => onPointerDown(e)}
            onTouchMove={(e) => onPointerMove(e)}
            onTouchEnd={(e) => onPointerUp(e)}
          >
            <button
              className="gallery-fav"
              title="View in lightbox"
              onClick={() => setLightboxOpen(true)}
              aria-label="Open lightbox"
            >
              🔍
            </button>

            <motion.div className="gallery-main-wrap" layout>
              <AnimatePresence initial={false} custom={index}>
                <motion.img
                  key={images[index] + "-" + index}
                  src={images[index]}
                  alt={`${product.name} — image ${index + 1}`}
                  className="gallery-main"
                  initial={{ opacity: 0, scale: 0.98, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -6 }}
                  transition={{ duration: 0.36 }}
                  draggable={false}
                />
              </AnimatePresence>
            </motion.div>

            <button className="gallery-nav prev" onClick={handlePrev} aria-label="Previous image">‹</button>
            <button className="gallery-nav next" onClick={handleNext} aria-label="Next image">›</button>

            <div className="gallery-shadow" aria-hidden="true" />
          </div>

          {/* thumbnails (horizontal, scrollable) */}
          {images.length > 1 && (
            <div className="thumb-row" role="list">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  className={`thumb ${i === index ? "active" : ""}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={src} alt={`thumb ${i + 1}`} draggable={false} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: info */}
        <motion.div className="pd-info" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <div className="pd-headline">
            <h1 className="pd-title">{product.name}</h1>
            <div className="pd-tagline muted">{product.subTitle || ""}</div>
          </div>

          <div className="pd-sub muted">{product.shortDescription || product.description?.slice(0, 160)}</div>

          {/* Notes / accords */}
          {product.notes && product.notes.length > 0 && (
            <div className="pd-notes">
              {(product.notes || []).map((n, i) => (
                <div key={i} className="note">{n}</div>
              ))}
            </div>
          )}

          {/* long description with collapse */}
          {product.description && (
            <div className="pd-desc">
              <div className={`pd-desc-text ${descExpanded ? "expanded" : "collapsed"}`}>
                {product.description}
              </div>
              <button className="btn ghost small pd-desc-toggle" onClick={() => setDescExpanded((s) => !s)}>
                {descExpanded ? "Show less" : "Read more"}
              </button>
            </div>
          )}

          {/* specs */}
          {product.specs && Object.keys(product.specs || {}).length > 0 && (
            <div className="pd-specs">
              <h4>Details</h4>
              <dl>
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="spec-row">
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="pd-buy">
            <div>
              <div className="price-large">{formatPrice(product.price)}</div>
              <div className="muted small pd-stock">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</div>
            </div>

            <div className="qty" role="group" aria-label="Quantity">
              <button onClick={() => setQty((s) => Math.max(1, s - 1))} aria-label="Decrease quantity">−</button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || 1)))}
                aria-label="Quantity"
              />
              <button onClick={() => setQty((s) => s + 1)} aria-label="Increase quantity">+</button>
            </div>

            <div className="pd-actions">
              <button
                className="btn primary"
                onClick={() => {
                  addToCart(product, qty);
                  navigate("/cart");
                }}
                aria-label="Add to cart and checkout"
              >
                Buy now
              </button>

              <button
                className="btn ghost"
                onClick={() => {
                  addToCart(product, qty);
                }}
                aria-label="Add to cart and continue shopping"
              >
                Add to cart
              </button>

              <button className={`btn ${wishlisted ? "primary" : "ghost"}`} onClick={toggleWishlist} aria-pressed={wishlisted}>
                {wishlisted ? "Wishlisted ★" : "Add to wishlist"}
              </button>
            </div>
          </div>

          <div className="pd-meta">
            <div><strong>Tags:</strong> {(product.tags || []).slice(0, 6).join(", ") || "—"}</div>
            <div className="muted small">SKU: {product.id}</div>
            <div className="pd-shipping muted small">Free shipping over ₹1999 • Easy returns (7 days)</div>
          </div>

          {/* social share & quick trust */}
          <div className="pd-social">
            <div className="pd-share">
              <button className="btn ghost small" onClick={() => handleShare("twitter")}>Share Twitter</button>
              <button className="btn ghost small" onClick={() => handleShare("facebook")}>Share Facebook</button>
              <button className="btn ghost small" onClick={() => handleShare("whatsapp")}>Share WhatsApp</button>
              <button className="btn ghost small" onClick={() => handleShare("copy")}>Copy link</button>
            </div>
            <div className="pd-trust">
              <span>Secure checkout</span> • <span>Authentic ingredients</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lightbox overlay */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
          >
            <motion.img
              className="lightbox-img"
              src={images[index]}
              alt={`${product.name} — large`}
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              transition={{ duration: 0.28 }}
              onClick={(e) => e.stopPropagation()}
            />
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close">✕</button>
            <button className="lightbox-prev" onClick={(e) => { e.stopPropagation(); handlePrev(); }} aria-label="Previous">‹</button>
            <button className="lightbox-next" onClick={(e) => { e.stopPropagation(); handleNext(); }} aria-label="Next">›</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews */}
      <section className="pd-section reviews container">
        <h3>Customer Reviews</h3>
        <div className="reviews-grid">
          <div className="reviews-summary">
            <div className="avg-rating">
              <div className="big">{(reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length)).toFixed(1)}</div>
              <div className="muted small">{reviews.length} reviews</div>
            </div>
          </div>
          <div className="reviews-list">
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="review-head">
                  <strong>{r.name}</strong>
                  <div className="rating">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                </div>
                <div className="review-body muted">{r.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related / You may also like */}
      {related && related.length > 0 && (
        <section className="pd-section related container">
          <h3>You may also like</h3>
          <div className="related-grid">
            {related.map((p) => (
              <article key={p.id} className="related-card" onClick={() => navigate(`/product/${p.id}`)}>
                <img src={p.imageUrl || "/smoke-fallback.jpg"} alt={p.name} loading="lazy" />
                <div className="rc-body">
                  <div className="rc-title">{p.name}</div>
                  <div className="rc-price">{formatPrice(p.price)}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
