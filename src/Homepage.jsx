// src/Homepage.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./styles.css";
import FeaturedSection from "./FeaturedSection";
import { getProducts, formatPrice } from "./data/products";
import FindYourScent from "./FindYourScent";
/**
 * Homepage with animated hero that cycles through product bottles.
 *
 * Props:
 *  - products: optional array of product objects { id, name, price, image, description }
 *  - onAddToCart: optional function(product)
 *
 * Requirements:
 *  - public/smoke.mp4 and public/smoke-fallback.jpg
 *  - bottle PNGs referenced in src/data/products.js
 */

export default function Homepage({ products = [], onAddToCart = () => {} }) {
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const [videoOk, setVideoOk] = useState(true);

  // unified product source (use passed products if provided, otherwise central data)
  const productList = products && products.length ? products : getProducts();

  // Carousel state
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Parallax scent movement
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    function handleMove(e) {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty("--mx", (x * 12).toFixed(2) + "px");
      hero.style.setProperty("--my", (y * 8).toFixed(2) + "px");
    }
    function handleLeave() {
      hero.style.setProperty("--mx", "0px");
      hero.style.setProperty("--my", "0px");
    }
    hero.addEventListener("mousemove", handleMove);
    hero.addEventListener("mouseleave", handleLeave);
    return () => {
      hero.removeEventListener("mousemove", handleMove);
      hero.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  // Cycle products every 4s, pause when hovered
  useEffect(() => {
    if (!productList || productList.length <= 1) return;
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % productList.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, productList.length]);

  // Try to autoplay the video; fallback to image if blocked
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    async function tryPlay() {
      try {
        await v.play();
        setVideoOk(true);
      } catch (err) {
        console.warn("Video autoplay failed or blocked:", err);
        setVideoOk(false);
      }
    }

    if (v.readyState >= 3) tryPlay();
    else {
      const onLoaded = () => tryPlay();
      const onError = () => setVideoOk(false);
      v.addEventListener("loadeddata", onLoaded);
      v.addEventListener("error", onError);
      return () => {
        v.removeEventListener("loadeddata", onLoaded);
        v.removeEventListener("error", onError);
      };
    }
  }, []);

  function onVideoError(e) {
    console.error("Hero video error:", e);
    setVideoOk(false);
  }

  // Motion variants
  const titleVariant = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } };
  const subtitleVariant = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="homepage">
      <section className="hero" ref={heroRef} aria-labelledby="hero-title">
        {/* Video background */}
        <div className="hero-video-bg" aria-hidden={!videoOk}>
          <video
            ref={videoRef}
            className="hero-video"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/smoke-fallback.jpg"
            onError={onVideoError}
          >
            <source src="/smoke.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Fallback still */}
        {!videoOk && (
          <div
            className="hero-video-fallback"
            role="img"
            aria-label="Smoke background"
            style={{ backgroundImage: `url('/smoke-fallback.jpg')` }}
          />
        )}

        {/* decorations over video */}
        <div className="hero-bg" aria-hidden="true">
          <span className="scent scent-1" />
          <span className="scent scent-2" />
          <span className="scent scent-3" />
        </div>

        {/* content */}
        <div className="hero-inner">
          <div className="hero-left">
            <motion.h1
              id="hero-title"
              className="hero-title"
              variants={titleVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              Scents that linger. <span className="accent">Stories that stay.</span>
            </motion.h1>

            <motion.p
              className="hero-sub"
              variants={subtitleVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
            >
              Hand-blended perfumes crafted from rare essences. Discover bottles that feel like an echo of memory — light,
              luxe, and memorably yours.
            </motion.p>

            <div className="hero-ctas">
              <motion.a
                className="btn primary"
                href="#featured"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                Shop Collection
              </motion.a>

              <motion.button
                className="btn ghost"
                onClick={() => {
                  const el = document.querySelector("#about");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.36 }}
              >
                Our Story
              </motion.button>
            </div>

            <div className="hero-features" aria-hidden="true">
              <motion.div className="feature" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.44 }}>
                <strong>Hand-blended</strong>
                <span>Small-batch quality</span>
              </motion.div>

              <motion.div className="feature" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}>
                <strong>Natural extracts</strong>
                <span>Botanical & premium oils</span>
              </motion.div>

              <motion.div className="feature" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.56 }}>
                <strong>Sustainable</strong>
                <span>Recyclable packaging</span>
              </motion.div>
            </div>
          </div>

          {/* RIGHT: stacked carousel of bottles */}
          <div
            className="hero-right"
            aria-hidden={false}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="bottle-carousel" role="region" aria-label="Featured perfumes carousel">
              {productList.map((p, i) => {
                const isActive = i === activeIndex;
                return (
                  <motion.div
                    key={p.id}
                    className="bottle-wrap carousel-item"
                    initial={{ opacity: 0, scale: 0.96, y: 18 }}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      scale: isActive ? 1 : 0.96,
                      y: isActive ? 0 : 18,
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-hidden={!isActive}
                  >
                    <motion.img
                      className="bottle"
                      src={p.image || "/smoke-fallback.jpg"}
                      alt={p.name}
                      draggable="false"
                      initial={{ scale: 0.96, opacity: 0 }}
                      animate={{ scale: isActive ? 1 : 0.96, opacity: isActive ? 1 : 0 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      style={{ zIndex: 2 }}
                    />
                    <div className="bottle-glow" />
                    <div className="bottle-shadow" />
                    <motion.div
                      className="floating-label"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 8 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.18 }}
                    >
                      <div className="label-name">{p.name}</div>
                      <div className="label-price">{formatPrice(p.price)}</div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* External, modular featured section */}
      <FeaturedSection products={productList} onAddToCart={onAddToCart} />
      <FindYourScent onAddToCart={onAddToCart} />

      {/* COLLECTION */}
      <section id="collection" className="collection">
        <h2 className="section-title">Signature Collection</h2>
        <p className="section-sub">Curated favorites — crafted with care.</p>

        <div className="carousel" role="list">
          {productList.map((p, i) => (
            <motion.article key={p.id} className="product-card" role="listitem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}>
              <div className="pc-media">
                <img src={p.image || "/smoke-fallback.jpg"} alt={p.name} loading="lazy" />
              </div>
              <div className="pc-body">
                <h3>{p.name}</h3>
                <p className="muted small">{p.description}</p>
                <div className="pc-foot">
                  <div className="price">{formatPrice(p.price)}</div>
                  <button className="btn small primary" onClick={() => onAddToCart(p)}>
                    Add
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="about">
        <div className="about-inner">
          <div className="about-art" aria-hidden="true">
            <img src="/smoke-fallback.jpg" alt="" />
          </div>
          <div className="about-text">
            <h2 className="section-title">Our Atelier</h2>
            <p>
              Each perfume begins with a small story — a memory, a place, a color. Our perfumer blends those moments into compositions that are intimate and bold.
            </p>
            <p className="muted small">Free samples with orders over ₹5,000. Refill program available.</p>
            <div className="about-cta">
              <a href="#collection" className="btn ghost">Browse All</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
