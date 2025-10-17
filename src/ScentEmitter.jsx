// src/ScentEmitter.jsx
import React, { useEffect, useRef } from "react";

/**
 * ScentEmitter - lightweight canvas particle emitter
 *
 * Props:
 *  - targetRef: React ref to the DOM element to emit from (required)
 *  - colors: array of CSS color strings used for particles (e.g. ['rgba(200,110,220,0.9)'])
 *  - enabled: boolean (if false, emitter pauses)
 *  - density: number (particles per second baseline)
 *  - size: [min,max] particle size in px
 *  - drift: {x, y} base velocity multipliers
 *
 * Simple, efficient, and tuned for subtle perfume-like "sprinkle" particles.
 */
export default function ScentEmitter({
  targetRef,
  colors = ["rgba(200,110,220,0.95)", "rgba(120,200,255,0.85)"],
  enabled = true,
  density = 18,
  size = [6, 22],
  drift = { x: 0.06, y: -0.24 },
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particles = useRef([]);
  const lastTime = useRef(performance.now());
  const spawnAccum = useRef(0);

  const rand = (a, b) => Math.random() * (b - a) + a;

  function spawnParticle(x, y) {
    const angle = rand(-Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); // prefer upward
    const speed = rand(0.12, 0.85);
    const vx = Math.cos(angle) * speed + rand(-0.02, 0.02);
    const vy = Math.sin(angle) * speed + rand(-0.02, 0.02);
    const life = rand(1400, 3800);
    const s = rand(size[0], size[1]);
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.current.push({
      x,
      y,
      vx: vx + drift.x * rand(-0.8, 0.8),
      vy: vy + drift.y * rand(0.5, 1.6),
      life,
      age: 0,
      size: s,
      color,
      alpha: 1,
      amp: rand(6, 26),
      wobble: rand(0.6, 2.6),
    });
    // cap
    if (particles.current.length > 1200) particles.current.splice(0, 350);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let mounted = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function tick(now) {
      if (!mounted) return;
      const dt = Math.min(40, now - lastTime.current);
      lastTime.current = now;

      // clear area (transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // compute emitter position
      let emitterX = window.innerWidth / 2;
      let emitterY = window.innerHeight / 2;
      const target = targetRef && targetRef.current;
      if (target && target.getBoundingClientRect) {
        const r = target.getBoundingClientRect();
        emitterX = r.left + r.width / 2;
        emitterY = r.top + r.height * 0.2;
      }

      // spawn particles according to density
      if (enabled && target) {
        spawnAccum.current += (density * dt) / 1000;
        while (spawnAccum.current >= 1) {
          spawnParticle(emitterX + rand(-14, 14), emitterY + rand(-8, 8));
          spawnAccum.current -= 1;
        }
      }

      // draw particles
      const arr = particles.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.age += dt;
        if (p.age >= p.life) {
          arr.splice(i, 1);
          continue;
        }
        const t = p.age / p.life;
        // wobble and motion
        const wob = Math.sin((p.age / 800) * p.wobble) * p.amp * 0.02;
        p.x += p.vx * dt + wob;
        p.y += p.vy * dt;
        // subtle change to vx
        p.vx += (Math.random() - 0.5) * 0.0006 * dt;

        // fade rule
        p.alpha = Math.max(0, 1 - t * t * 1.05);
        const drawSize = p.size * (1 + Math.sin(t * Math.PI) * 0.12);

        // draw as soft circle
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = p.alpha * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, drawSize, drawSize * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetRef, colors, enabled, density, size, drift]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 999,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
        mixBlendMode: "screen",
      }}
    />
  );
}
