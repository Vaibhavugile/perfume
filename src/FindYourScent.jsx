// src/FindYourScent.jsx
import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./findYourScent.css";
import { getProducts, formatPrice } from "./data/products";
import ScentEmitter from "./ScentEmitter";
import QuickView from "./QuickView";
/* MOODS list (art, colors etc.) */
const MOODS = [
  {
    id: "romantic",
    title: "Romantic",
    desc: "Soft florals, warm vanilla, tender musk.",
   // icon: "💗",
    tags: ["floral", "vanilla", "amber"],
    color: ["rgba(246,192,232,0.95)", "rgba(200,110,220,0.9)"],
    art: "/mood-romantic.png",
  },
  {
    id: "fresh",
    title: "Fresh",
    desc: "Citrus lift, green accords, clean musk.",
   // icon: "🍋",
    tags: ["citrus", "fresh", "green"],
    color: ["rgba(191,233,255,0.95)", "rgba(104,195,255,0.9)"],
    art: "/mood-fresh.png",
  },
  {
    id: "mysterious",
    title: "Mysterious",
    desc: "Smoky woods, deep oud, dark amber.",
    //icon: "🖤",
    tags: ["oriental", "woody", "smoky"],
    color: ["rgba(198,176,255,0.9)", "rgba(111,66,193,0.85)"],
    art: "/mood-mysterious.png",
  },
  {
    id: "bright",
    title: "Bright",
    desc: "Sparkling top notes, playful lively energy.",
    //icon: "☀️",
    tags: ["citrus", "fresh"],
    color: ["rgba(255,240,184,0.95)", "rgba(255,184,77,0.9)"],
    art: "/mood-bright.png",
  },
  {
    id: "comfort",
    title: "Comforting",
    desc: "Warm spice, vanilla, gentle amber embrace.",
    //icon: "🕯️",
    tags: ["amber", "spicy", "vanilla"],
    color: ["rgba(255,214,192,0.95)", "rgba(217,142,106,0.9)"],
    art: "/mood-comfort.png",
  },
];

export default function FindYourScent({ onAddToCart = () => {} }) {
  const all = useMemo(() => getProducts(), []);
  const [activeMood, setActiveMood] = useState(null);
  const [showAllForMood, setShowAllForMood] = useState(false);
const [hoveredBottleId, setHoveredBottleId] = useState(null);
const hoveredRef = useRef(null);            // ref for emitter when hovering a bottle
const [quickProduct, setQuickProduct] = useState(null);
const quickRef = useRef(null);              // ref to attach emitter when modal open

  // refs for orbs so emitter can attach
  const orbRefs = useRef({});

  const filtered = useMemo(() => {
    if (!activeMood) return [];
    const mood = MOODS.find((m) => m.id === activeMood);
    if (!mood) return [];
    return all.filter((p) => (p.tags || []).some((t) => mood.tags.includes(t)));
  }, [activeMood, all]);

  return (
    <section id="find-your-scent" className="find-scent-section" aria-labelledby="find-scent-title">
      {/* decorative optional images */}
      <div className="decor-images" aria-hidden="true">
        <img className="decor decor-1" src="/decor-petal-1.png" alt="" />
        <img className="decor decor-2" src="/decor-petal-2.png" alt="" />
      </div>

      <div className="container">
        <motion.div className="fy-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h2 id="find-scent-title" className="section-title">Find Your Scent</h2>
          <p className="section-sub">Choose a mood — we’ll show scents that match it.</p>
        </motion.div>

        <motion.div className="mood-row" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}>
          {MOODS.map((m) => {
            const isActive = activeMood === m.id;
            if (!orbRefs.current[m.id]) orbRefs.current[m.id] = React.createRef();
            return (
              <motion.button
                key={m.id}
                ref={orbRefs.current[m.id]}
                className={`mood-orb ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (isActive) {
                    setActiveMood(null);
                    setShowAllForMood(false);
                  } else {
                    setActiveMood(m.id);
                    setShowAllForMood(false);
                    setTimeout(() => {
                      const el = document.querySelector("#find-your-scent .mood-results");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 220);
                  }
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                aria-pressed={isActive}
                style={{ "--g1": m.color[0], "--g2": m.color[1] }}
              >
                <div className="orb-emoji">{m.icon}</div>

                <div className="orb-art-wrap" aria-hidden={!m.art}>
                  <motion.img src={m.art} alt="" className="orb-art" initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8 }} />
                </div>
<div className="orb-text">
  <div className="orb-title">{m.title}</div>
  {/* <div className="orb-desc">{m.desc}</div> */}
</div>

                <span className="orb-ring" aria-hidden="true" />
              </motion.button>
            );
          })}
        </motion.div>

        <div className="mood-results" role="region" aria-live="polite">
          {!activeMood ? (
            <motion.div className="mood-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
              <p className="muted">Select a mood to discover matching perfumes.</p>
            </motion.div>
          ) : (
            <>
              <motion.div className="results-head" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                <h3>Showing scents for <span className="tag">{MOODS.find(m => m.id === activeMood)?.title}</span></h3>
                <div className="results-actions">
                  <button className="btn ghost" onClick={() => { setActiveMood(null); setShowAllForMood(false); }}>Clear</button>
                  <button className="btn primary" onClick={() => { setShowAllForMood(true); const el = document.querySelector("#find-your-scent .mood-results .grid"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                    Show all {filtered.length} →
                  </button>
                </div>
              </motion.div>

              <motion.div className="grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              {(showAllForMood ? filtered : filtered.slice(0, 4)).map((p, i) => (
  <motion.article
    key={p.id}
    className="product-card-mini"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 + i * 0.06 }}
    whileHover={{ translateY: -6 }}
    onMouseEnter={() => { setHoveredBottleId(p.id); hoveredRef.current = document.getElementById(`bottle-${p.id}`); }}
    onMouseLeave={() => { setHoveredBottleId(null); hoveredRef.current = null; }}
  >
    <div className="pcm-media">
      <img id={`bottle-${p.id}`} src={p.image || "/smoke-fallback.jpg"} alt={p.name} loading="lazy" style={{ maxHeight: 72, maxWidth: 72 }} />
    </div>

    <div className="pcm-body">
      <h4>{p.name}</h4>
      <div className="muted small">{p.description}</div>
      <div className="pcm-foot">
        <div className="price">{formatPrice(p.price)}</div>
        <div>
          <button className="btn small ghost" onClick={() => setQuickProduct(p)}>Quick view</button>
          <button className="btn small primary" onClick={() => onAddToCart(p)}>Add</button>
        </div>
      </div>
    </div>
  </motion.article>
))}

              </motion.div>

              {(!showAllForMood && filtered.length > 4) && (
                <div className="mood-showmore">
                  <button className="btn ghost" onClick={() => setShowAllForMood(true)}>Show more</button>
                </div>
              )}

              {showAllForMood && (
                <div className="mood-showmore">
                  <button className="btn ghost" onClick={() => setShowAllForMood(false)}>Show less</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Attach the scent emitter to the active orb */}
      {/* Bottle-hover emitter (emits from hovered bottle element) */}
{hoveredBottleId && hoveredRef.current && (
  <ScentEmitter
    targetRef={{ current: hoveredRef.current }}
    colors={MOODS.find((m) => m.id === activeMood)?.color || ["rgba(200,110,220,0.95)"]}
    enabled={true}
    density={18}
    size={[4, 20]}
    drift={{ x: 0.04, y: -0.22 }}
  />
)}

{/* Quick view modal */}
{quickProduct && (
  <>
    <QuickView
      product={quickProduct}
      onClose={() => setQuickProduct(null)}
      onAddToCart={(p) => { onAddToCart(p); }}
      emitterRef={quickRef}
    />
    {/* Emitter behind modal bottle */}
    {quickRef && quickRef.current && (
      <ScentEmitter
        targetRef={quickRef}
        colors={["rgba(246,192,232,0.95)", "rgba(200,110,220,0.9)"]}
        enabled={true}
        density={28}
        size={[8, 36]}
        drift={{ x: 0.02, y: -0.28 }}
      />
    )}
  </>
)}

    </section>
  );
}
