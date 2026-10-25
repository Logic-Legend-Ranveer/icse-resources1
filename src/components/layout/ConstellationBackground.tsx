import { useEffect, useRef } from 'react';

// --- engine start ---
/* Tuning — everything you'd want to change lives here. */
const AREA_PER_STAR = 11000; // px² of screen per star: lower = denser
const MIN_STARS = 28;
const MAX_STARS = 130;
const LINE_MAX_ALPHA = 0.3; // brightest a connecting line gets (0–1). Keep low so text stays readable.
const CURSOR_RADIUS = 170; // how far from the pointer stars link to it
const REPEL_RADIUS = 140; // how far from the pointer stars get nudged away

// RGB triplets, taken from the app palette (indigo-300 / violet-300 stars, indigo-400 lines).
const STAR_COLORS = ['165, 180, 252', '196, 181, 253'];
const LINE_RGB = '129, 140, 248';
const CURSOR_RGB = '167, 139, 250';

const TAU = Math.PI * 2;
const LINE_BUCKETS = 5; // lines are batched into this many alpha levels → 5 strokes/frame instead of hundreds

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  phase: number;
  twinkleSpeed: number;
  color: string;
  bright: boolean;
}

interface ConstellationController {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

function startConstellation(canvas: HTMLCanvasElement, reducedMotion: boolean): ConstellationController {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setPaused: () => {}, destroy: () => {} };

  let width = 0;
  let height = 0;
  let linkDist = 120;
  let stars: Star[] = [];
  let raf = 0;
  let lastTime = 0;
  let paused = false;
  let resizeTimer = 0;
  const pointer = { x: -9999, y: -9999, active: false };
  const buckets: number[][] = Array.from({ length: LINE_BUCKETS }, () => []);

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  function makeStar(): Star {
    const speed = rand(0.12, 0.3); // px per 1/60s
    const angle = rand(0, TAU);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    return {
      x: rand(0, width),
      y: rand(0, height),
      vx,
      vy,
      baseVx: vx,
      baseVy: vy,
      radius: rand(1.0, 2.0),
      phase: rand(0, TAU),
      twinkleSpeed: rand(0.5, 1.4),
      color: STAR_COLORS[Math.random() < 0.5 ? 0 : 1],
      bright: Math.random() < 0.1,
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    linkDist = Math.min(170, Math.max(100, width / 9));
    const want = Math.max(MIN_STARS, Math.min(MAX_STARS, Math.round((width * height) / AREA_PER_STAR)));
    while (stars.length < want) stars.push(makeStar());
    if (stars.length > want) stars.length = want;
    for (const s of stars) {
      s.x = Math.min(s.x, width);
      s.y = Math.min(s.y, height);
    }
    if (reducedMotion) draw(0);
  }

  function step(dt: number) {
    const k = dt * 60; // normalise to "frames at 60fps" so speed is the same on 120/144Hz screens
    const margin = 20;
    for (const s of stars) {
      if (pointer.active) {
        const dx = s.x - pointer.x;
        const dy = s.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1) {
          const d = Math.sqrt(d2);
          const push = (1 - d / REPEL_RADIUS) * 0.05 * k;
          s.vx += (dx / d) * push;
          s.vy += (dy / d) * push;
        }
      }
      // ease back toward the star's own drift after being nudged
      s.vx += (s.baseVx - s.vx) * 0.03 * k;
      s.vy += (s.baseVy - s.vy) * 0.03 * k;
      s.x += s.vx * k;
      s.y += s.vy * k;
      if (s.x < -margin) s.x = width + margin;
      else if (s.x > width + margin) s.x = -margin;
      if (s.y < -margin) s.y = height + margin;
      else if (s.y > height + margin) s.y = -margin;
    }
  }

  function draw(seconds: number) {
    const c = ctx!;
    c.clearRect(0, 0, width, height);

    // 1) star-to-star lines, batched by brightness
    for (const b of buckets) b.length = 0;
    const maxD2 = linkDist * linkDist;
    for (let i = 0; i < stars.length; i++) {
      const a = stars[i];
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j];
        const dx = a.x - b.x;
        if (dx > linkDist || dx < -linkDist) continue;
        const dy = a.y - b.y;
        if (dy > linkDist || dy < -linkDist) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= maxD2) continue;
        const strength = 1 - Math.sqrt(d2) / linkDist;
        buckets[Math.min(LINE_BUCKETS - 1, Math.floor(strength * LINE_BUCKETS))].push(a.x, a.y, b.x, b.y);
      }
    }
    c.lineWidth = 1;
    for (let level = 0; level < LINE_BUCKETS; level++) {
      const seg = buckets[level];
      if (seg.length === 0) continue;
      c.strokeStyle = `rgba(${LINE_RGB}, ${((level + 1) / LINE_BUCKETS) * LINE_MAX_ALPHA})`;
      c.beginPath();
      for (let k = 0; k < seg.length; k += 4) {
        c.moveTo(seg[k], seg[k + 1]);
        c.lineTo(seg[k + 2], seg[k + 3]);
      }
      c.stroke();
    }

    // 2) pointer-to-star lines
    if (pointer.active) {
      for (const s of stars) {
        const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
        if (d >= CURSOR_RADIUS) continue;
        c.strokeStyle = `rgba(${CURSOR_RGB}, ${(1 - d / CURSOR_RADIUS) * 0.55})`;
        c.beginPath();
        c.moveTo(pointer.x, pointer.y);
        c.lineTo(s.x, s.y);
        c.stroke();
      }
    }

    // 3) stars (a few brighter ones get a soft halo)
    for (const s of stars) {
      const twinkle = 0.65 + 0.35 * Math.sin(seconds * s.twinkleSpeed + s.phase);
      const alpha = (s.bright ? 0.95 : 0.7) * twinkle;
      if (s.bright) {
        c.fillStyle = `rgba(${s.color}, ${alpha * 0.16})`;
        c.beginPath();
        c.arc(s.x, s.y, s.radius * 4.5, 0, TAU);
        c.fill();
      }
      c.fillStyle = `rgba(${s.color}, ${alpha})`;
      c.beginPath();
      c.arc(s.x, s.y, s.radius, 0, TAU);
      c.fill();
    }
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000)); // clamp so a backgrounded tab doesn't cause a jump
    lastTime = now;
    step(dt);
    draw(now / 1000);
  }

  function sync() {
    const shouldRun = !paused && !document.hidden && !reducedMotion;
    if (shouldRun && !raf) {
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') pointer.active = false; // touch: effect only while a finger is down
  };
  const onPointerLeave = () => {
    pointer.active = false;
  };
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  };

  resize();
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', sync);
  if (!reducedMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);
  }
  sync();

  return {
    setPaused(next: boolean) {
      paused = next;
      sync();
    },
    destroy() {
      paused = true;
      sync();
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
    },
  };
}
// --- engine end ---

interface ConstellationBackgroundProps {
  /** Freeze the animation (e.g. while a modal is open, so its backdrop blur isn't recomputed every frame). */
  paused?: boolean;
}

/**
 * Drifting, softly twinkling stars joined by faint lines when they pass near each
 * other, plus a few lines that reach for the cursor. Sits behind everything.
 *
 * Needs the parent to be `relative isolate` so the -z-10 canvas paints above the
 * parent's own background but below its content. Honors prefers-reduced-motion
 * (draws one still frame) and stops entirely while the tab is hidden.
 */
export default function ConstellationBackground({ paused = false }: ConstellationBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ConstellationController | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const launch = () => {
      controllerRef.current?.destroy();
      controllerRef.current = startConstellation(canvas, motion.matches);
      controllerRef.current.setPaused(pausedRef.current);
    };
    launch();
    motion.addEventListener('change', launch);

    return () => {
      motion.removeEventListener('change', launch);
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    controllerRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
