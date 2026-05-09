"use client";

import { useEffect, useRef } from "react";

/**
 * Pool table + balls + cursor cue stick.
 *
 * All sizing derives from a single base value, `ballD` (ball diameter), which
 * scales with the viewport per `clamp(28, width * 0.035, 50)` — equivalent to
 * the CSS `clamp(28px, 3.5vw, 50px)` recipe. Every other dimension (rail
 * thickness, pocket radii, cue length, etc.) is a multiplier on `ballD`, so
 * resizing the window keeps proportions intact.
 *
 *   ball diameter        = clamp(28, viewport * 0.035, 50)
 *   corner pocket diam.  = 2.1 × ball diameter
 *   side pocket diam.    = 1.9 × ball diameter
 *   rail thickness       = 1.1 × ball diameter
 *   cue length           = 2.7 × ball diameter
 *
 * Two stacked canvases let the cue render above the entire page:
 *   - tableCanvas (z-index -1): rails, felt, pockets, balls — behind content
 *   - cueCanvas   (z-index 9999): cue stick only — above content (forms,
 *     cards, buttons), pointer-events none so clicks pass through.
 */

const POOL_BALLS: { color: string; number: number; stripe: boolean }[] = [
  { color: "#f5f0e1", number: 0, stripe: false },
  { color: "#f1c40f", number: 1, stripe: false },
  { color: "#1f5fa8", number: 2, stripe: false },
  { color: "#c0392b", number: 3, stripe: false },
  { color: "#6a1b9a", number: 4, stripe: false },
  { color: "#e67e22", number: 5, stripe: false },
  { color: "#1e7e34", number: 6, stripe: false },
  { color: "#6d2c1d", number: 7, stripe: false },
  { color: "#0a0a0a", number: 8, stripe: false },
  { color: "#f1c40f", number: 9, stripe: true },
  { color: "#1f5fa8", number: 10, stripe: true },
  { color: "#c0392b", number: 11, stripe: true },
  { color: "#6a1b9a", number: 12, stripe: true },
  { color: "#e67e22", number: 13, stripe: true },
  { color: "#1e7e34", number: 14, stripe: true },
  { color: "#6d2c1d", number: 15, stripe: true },
];

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  color: string;
  number: number;
  stripe: boolean;
  /** 0 = on table; >0 = sinking animation progress in ms */
  sinking: number;
}

interface Pocket {
  x: number;
  y: number;
  r: number;
  isCorner: boolean;
}

const FRICTION = 0.994;
const RESTITUTION = 0.92;
const MAX_SPEED = 6;
const SINK_DURATION = 280;

// All proportions derived from a single ball diameter. Pockets kept small
// per design preference — visually a hole, not a giant socket.
const BALL_TO_CORNER_POCKET = 1.3;   // corner pocket diameter / ball diameter
const BALL_TO_SIDE_POCKET = 1.25;    // side pocket diameter / ball diameter
const BALL_TO_RAIL = 0.9;             // rail thickness / ball diameter
const BALL_TO_CUE = 2.7;              // cue length / ball diameter

function lighten(hex: string, amount: number) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function computeBallDiameter(viewportWidth: number): number {
  // Equivalent to clamp(28px, 3.5vw, 50px)
  return Math.max(28, Math.min(50, viewportWidth * 0.035));
}

function buildPockets(w: number, h: number, railW: number, cornerR: number, sideR: number): Pocket[] {
  // Pockets sit slightly inside the corner where the felt meets the rail,
  // so the visible black circle reads as a small drilled hole.
  const inset = railW * 0.55;
  return [
    { x: inset, y: inset, r: cornerR, isCorner: true },
    { x: w / 2, y: railW * 0.5, r: sideR, isCorner: false },
    { x: w - inset, y: inset, r: cornerR, isCorner: true },
    { x: inset, y: h - inset, r: cornerR, isCorner: true },
    { x: w / 2, y: h - railW * 0.5, r: sideR, isCorner: false },
    { x: w - inset, y: h - inset, r: cornerR, isCorner: true },
  ];
}

export function PoolBallsBackground() {
  const tableCanvasRef = useRef<HTMLCanvasElement>(null);
  const cueCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const tableCanvas = tableCanvasRef.current;
    const cueCanvas = cueCanvasRef.current;
    if (!tableCanvas || !cueCanvas) return;
    const ctx = tableCanvas.getContext("2d");
    const cueCtx = cueCanvas.getContext("2d");
    if (!ctx || !cueCtx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    // All dimensions derived from a single ball diameter
    let ballD = computeBallDiameter(width);
    let ballR = ballD / 2;
    let cornerPocketR = (ballD * BALL_TO_CORNER_POCKET) / 2;
    let sidePocketR = (ballD * BALL_TO_SIDE_POCKET) / 2;
    let railW = ballD * BALL_TO_RAIL;
    let cueLen = ballD * BALL_TO_CUE;
    let cueTipW = ballD * 0.05;
    let cueButtW = ballD * 0.11;
    let pockets = buildPockets(width, height, railW, cornerPocketR, sidePocketR);

    const mouse = { x: -9999, y: -9999, active: false };
    let velX = 1;
    let velY = 0;
    let prevX = 0;
    let prevY = 0;
    let cueAngle = 0;
    let lastTime = performance.now();
    let raf = 0;

    function recomputeSizes() {
      ballD = computeBallDiameter(width);
      ballR = ballD / 2;
      cornerPocketR = (ballD * BALL_TO_CORNER_POCKET) / 2;
      sidePocketR = (ballD * BALL_TO_SIDE_POCKET) / 2;
      railW = ballD * BALL_TO_RAIL;
      cueLen = ballD * BALL_TO_CUE;
      cueTipW = ballD * 0.05;
      cueButtW = ballD * 0.11;
      pockets = buildPockets(width, height, railW, cornerPocketR, sidePocketR);
    }

    function resize() {
      if (!tableCanvas || !cueCanvas || !ctx || !cueCtx) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const w = Math.round(width * dpr);
      const h = Math.round(height * dpr);
      tableCanvas.width = w;
      tableCanvas.height = h;
      cueCanvas.width = w;
      cueCanvas.height = h;
      tableCanvas.style.width = `${width}px`;
      tableCanvas.style.height = `${height}px`;
      cueCanvas.style.width = `${width}px`;
      cueCanvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cueCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      recomputeSizes();
    }
    resize();

    function spawnPosition(): { x: number; y: number; vx: number; vy: number } {
      const feltMinX = railW + ballR + 4;
      const feltMinY = railW + ballR + 4;
      for (let attempt = 0; attempt < 80; attempt++) {
        const x = feltMinX + Math.random() * Math.max(1, width - 2 * feltMinX);
        const y = feltMinY + Math.random() * Math.max(1, height - 2 * feltMinY);
        let ok = true;
        for (const p of pockets) {
          const dx = x - p.x;
          const dy = y - p.y;
          // Keep balls clear of the pocket's full sink + cushion zone
          const safeR = p.r + ballR + 8;
          if (dx * dx + dy * dy < safeR * safeR) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        for (const other of balls) {
          if (other.sinking > 0) continue;
          const dx = other.x - x;
          const dy = other.y - y;
          if (dx * dx + dy * dy < (ballR * 2.4) ** 2) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.2 + Math.random() * 1.5;
          return {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          };
        }
      }
      return {
        x: width / 2,
        y: height / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      };
    }

    const balls: Ball[] = [];
    for (const def of POOL_BALLS) {
      const pos = spawnPosition();
      balls.push({
        ...pos,
        spin: 0,
        color: def.color,
        number: def.number,
        stripe: def.stripe,
        sinking: 0,
      });
    }

    function isNearPocket(x: number, y: number): boolean {
      for (const p of pockets) {
        const dx = x - p.x;
        const dy = y - p.y;
        const gap = p.r * 1.4;
        if (dx * dx + dy * dy < gap * gap) return true;
      }
      return false;
    }

    function checkSink(b: Ball): boolean {
      for (const p of pockets) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const sinkR = p.r * 0.85;
        if (dx * dx + dy * dy < sinkR * sinkR) return true;
      }
      return false;
    }

    function onPointerMove(e: PointerEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    function onPointerLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    window.addEventListener("resize", resize);

    function drawTable() {
      if (!ctx) return;

      // Wood rail
      const woodGrad = ctx.createLinearGradient(0, 0, 0, height);
      woodGrad.addColorStop(0, "#8a5a2c");
      woodGrad.addColorStop(0.45, "#5c2c1c");
      woodGrad.addColorStop(0.55, "#5c2c1c");
      woodGrad.addColorStop(1, "#8a5a2c");
      ctx.fillStyle = woodGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#2a1208";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(y * 0.05) * 1.5);
        ctx.lineTo(width, y + Math.cos(y * 0.05) * 1.5);
        ctx.stroke();
      }
      ctx.restore();

      // Brass trim line at the felt edge
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        railW - 2,
        railW - 2,
        width - 2 * railW + 4,
        height - 2 * railW + 4,
      );

      // Felt — tournament green with soft vignette
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(width, height) * 0.85;
      const feltGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      feltGrad.addColorStop(0, "#229a4a");
      feltGrad.addColorStop(0.55, "#198140");
      feltGrad.addColorStop(1, "#0d4a23");
      ctx.fillStyle = feltGrad;
      ctx.fillRect(railW, railW, width - 2 * railW, height - 2 * railW);

      // Inner shadow on felt edges
      const shadowSize = Math.max(12, ballD * 0.4);
      let g = ctx.createLinearGradient(0, railW, 0, railW + shadowSize);
      g.addColorStop(0, "rgba(0,0,0,0.4)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(railW, railW, width - 2 * railW, shadowSize);
      g = ctx.createLinearGradient(0, height - railW - shadowSize, 0, height - railW);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = g;
      ctx.fillRect(railW, height - railW - shadowSize, width - 2 * railW, shadowSize);
      g = ctx.createLinearGradient(railW, 0, railW + shadowSize, 0);
      g.addColorStop(0, "rgba(0,0,0,0.4)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(railW, railW, shadowSize, height - 2 * railW);
      g = ctx.createLinearGradient(width - railW - shadowSize, 0, width - railW, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = g;
      ctx.fillRect(width - railW - shadowSize, railW, shadowSize, height - 2 * railW);

      // Pockets — small drilled hole with soft outer shadow
      for (const p of pockets) {
        const ringGrad = ctx.createRadialGradient(p.x, p.y, p.r * 0.7, p.x, p.y, p.r + 5);
        ringGrad.addColorStop(0, "rgba(0,0,0,0.65)");
        ringGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
        ctx.fill();

        const holeGrad = ctx.createRadialGradient(
          p.x - p.r * 0.2,
          p.y - p.r * 0.2,
          0,
          p.x,
          p.y,
          p.r,
        );
        holeGrad.addColorStop(0, "#1c1c1c");
        holeGrad.addColorStop(0.6, "#0a0a0a");
        holeGrad.addColorStop(1, "#000");
        ctx.fillStyle = holeGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawBall(b: Ball) {
      if (!ctx) return;
      const r = ballR;
      const sinkT = b.sinking > 0 ? Math.min(1, b.sinking / SINK_DURATION) : 0;
      const drawR = r * (1 - sinkT * 0.85);
      const alpha = 1 - sinkT;

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(b.x + 2, b.y + 5, drawR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, drawR, 0, Math.PI * 2);
      ctx.clip();

      if (b.number === 0) {
        const grad = ctx.createRadialGradient(
          b.x - drawR * 0.35, b.y - drawR * 0.35, drawR * 0.1, b.x, b.y, drawR,
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.6, b.color);
        grad.addColorStop(1, "#cdc4a8");
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - drawR, b.y - drawR, drawR * 2, drawR * 2);
      } else if (b.stripe) {
        const grad = ctx.createRadialGradient(
          b.x - drawR * 0.35, b.y - drawR * 0.35, drawR * 0.1, b.x, b.y, drawR,
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, "#d8d3c4");
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - drawR, b.y - drawR, drawR * 2, drawR * 2);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spin);
        ctx.fillStyle = b.color;
        ctx.fillRect(-drawR, -drawR * 0.5, drawR * 2, drawR);
        const bandGrad = ctx.createLinearGradient(0, -drawR * 0.5, 0, drawR * 0.5);
        bandGrad.addColorStop(0, "rgba(0,0,0,0.3)");
        bandGrad.addColorStop(0.5, "rgba(0,0,0,0)");
        bandGrad.addColorStop(1, "rgba(0,0,0,0.3)");
        ctx.fillStyle = bandGrad;
        ctx.fillRect(-drawR, -drawR * 0.5, drawR * 2, drawR);
      } else {
        const grad = ctx.createRadialGradient(
          b.x - drawR * 0.35, b.y - drawR * 0.35, drawR * 0.1, b.x, b.y, drawR,
        );
        grad.addColorStop(0, lighten(b.color, 60));
        grad.addColorStop(0.7, b.color);
        grad.addColorStop(1, lighten(b.color, -30));
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - drawR, b.y - drawR, drawR * 2, drawR * 2);
      }

      ctx.restore();

      if (b.number > 0 && sinkT < 0.7) {
        const discR = drawR * 0.42;
        ctx.beginPath();
        ctx.arc(b.x, b.y, discR, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.fillStyle = "#0a0a0a";
        ctx.font = `bold ${Math.round(drawR * 0.55)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(b.number), b.x, b.y + 1);
      }

      const gloss = ctx.createRadialGradient(
        b.x - drawR * 0.45, b.y - drawR * 0.5, drawR * 0.05,
        b.x - drawR * 0.45, b.y - drawR * 0.5, drawR * 0.6,
      );
      gloss.addColorStop(0, "rgba(255,255,255,0.7)");
      gloss.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(b.x, b.y, drawR, 0, Math.PI * 2);
      ctx.fillStyle = gloss;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(b.x, b.y, drawR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    function drawCue(tipX: number, tipY: number, angle: number) {
      if (!cueCtx) return;
      const tipPad = cueLen * 0.04;
      const ferrule = cueLen * 0.04;
      const jointAt = cueLen * 0.6;
      const shaftStart = tipPad + ferrule;

      cueCtx.save();
      cueCtx.translate(tipX, tipY);
      cueCtx.rotate(angle + Math.PI);

      cueCtx.save();
      cueCtx.translate(2, 4);
      cueCtx.beginPath();
      cueCtx.moveTo(0, -cueTipW);
      cueCtx.lineTo(cueLen, -cueButtW);
      cueCtx.lineTo(cueLen, cueButtW);
      cueCtx.lineTo(0, cueTipW);
      cueCtx.closePath();
      cueCtx.fillStyle = "rgba(0,0,0,0.45)";
      cueCtx.fill();
      cueCtx.restore();

      cueCtx.fillStyle = "#3b6abf";
      cueCtx.fillRect(0, -cueTipW, tipPad, cueTipW * 2);
      cueCtx.beginPath();
      cueCtx.arc(0, 0, cueTipW, Math.PI / 2, -Math.PI / 2, true);
      cueCtx.fillStyle = "#3b6abf";
      cueCtx.fill();

      cueCtx.fillStyle = "#f5f0e1";
      cueCtx.fillRect(tipPad, -cueTipW, ferrule, cueTipW * 2);

      const shaftGrad = cueCtx.createLinearGradient(shaftStart, 0, jointAt, 0);
      shaftGrad.addColorStop(0, "#e0b885");
      shaftGrad.addColorStop(1, "#a87a4a");
      cueCtx.fillStyle = shaftGrad;
      cueCtx.beginPath();
      cueCtx.moveTo(shaftStart, -cueTipW);
      cueCtx.lineTo(jointAt, -cueButtW * 0.7);
      cueCtx.lineTo(jointAt, cueButtW * 0.7);
      cueCtx.lineTo(shaftStart, cueTipW);
      cueCtx.closePath();
      cueCtx.fill();

      cueCtx.fillStyle = "#d4af37";
      cueCtx.fillRect(jointAt - 1.5, -cueButtW * 0.75, 3, cueButtW * 1.5);

      const wrapGrad = cueCtx.createLinearGradient(0, -cueButtW, 0, cueButtW);
      wrapGrad.addColorStop(0, "#2a1a10");
      wrapGrad.addColorStop(0.5, "#1a0e08");
      wrapGrad.addColorStop(1, "#2a1a10");
      cueCtx.fillStyle = wrapGrad;
      cueCtx.beginPath();
      cueCtx.moveTo(jointAt + 1.5, -cueButtW * 0.78);
      cueCtx.lineTo(cueLen, -cueButtW);
      cueCtx.lineTo(cueLen, cueButtW);
      cueCtx.lineTo(jointAt + 1.5, cueButtW * 0.78);
      cueCtx.closePath();
      cueCtx.fill();

      cueCtx.fillStyle = "#3a2515";
      cueCtx.beginPath();
      cueCtx.arc(cueLen, 0, cueButtW, -Math.PI / 2, Math.PI / 2);
      cueCtx.fill();

      const gloss = cueCtx.createLinearGradient(0, -cueButtW, 0, 0);
      gloss.addColorStop(0, "rgba(255,255,255,0.32)");
      gloss.addColorStop(1, "rgba(255,255,255,0)");
      cueCtx.fillStyle = gloss;
      cueCtx.beginPath();
      cueCtx.moveTo(shaftStart, -cueTipW);
      cueCtx.lineTo(jointAt, -cueButtW * 0.6);
      cueCtx.lineTo(jointAt, -cueButtW * 0.2);
      cueCtx.lineTo(shaftStart, -cueTipW * 0.3);
      cueCtx.closePath();
      cueCtx.fill();

      cueCtx.restore();
    }

    function step() {
      if (!ctx || !cueCtx) return;
      const now = performance.now();
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      drawTable();

      const repelRadius = ballD * 3.25;
      const repelStrength = 0.85;

      if (mouse.active) {
        const dx = mouse.x - prevX;
        const dy = mouse.y - prevY;
        prevX = mouse.x;
        prevY = mouse.y;
        const SMOOTH = 0.18;
        velX = velX * (1 - SMOOTH) + dx * SMOOTH;
        velY = velY * (1 - SMOOTH) + dy * SMOOTH;
        const speed = Math.hypot(velX, velY);
        if (speed > 0.4) cueAngle = Math.atan2(velY, velX);
      }

      if (mouse.active) {
        for (const b of balls) {
          if (b.sinking > 0) continue;
          const dx = b.x - mouse.x;
          const dy = b.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < repelRadius * repelRadius && d2 > 0.001) {
            const d = Math.sqrt(d2);
            const t = 1 - d / repelRadius;
            const f = t * t * repelStrength;
            b.vx += (dx / d) * f;
            b.vy += (dy / d) * f;
          }
        }
      }

      for (const b of balls) {
        if (b.sinking > 0) {
          b.sinking += dt;
          if (b.sinking >= SINK_DURATION) {
            const pos = spawnPosition();
            b.x = pos.x;
            b.y = pos.y;
            b.vx = pos.vx;
            b.vy = pos.vy;
            b.sinking = 0;
          }
          continue;
        }

        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_SPEED) {
          b.vx = (b.vx / sp) * MAX_SPEED;
          b.vy = (b.vy / sp) * MAX_SPEED;
        }
        b.x += b.vx;
        b.y += b.vy;
        b.spin += sp * 0.02;
        b.vx *= FRICTION;
        b.vy *= FRICTION;

        if (!isNearPocket(b.x, b.y)) {
          if (b.x - ballR < railW) {
            b.x = railW + ballR;
            b.vx = -b.vx * RESTITUTION;
          } else if (b.x + ballR > width - railW) {
            b.x = width - railW - ballR;
            b.vx = -b.vx * RESTITUTION;
          }
          if (b.y - ballR < railW) {
            b.y = railW + ballR;
            b.vy = -b.vy * RESTITUTION;
          } else if (b.y + ballR > height - railW) {
            b.y = height - railW - ballR;
            b.vy = -b.vy * RESTITUTION;
          }
        }

        if (checkSink(b)) {
          b.sinking = 1;
          b.vx *= 0.3;
          b.vy *= 0.3;
        }
      }

      const min = ballR * 2;
      const min2 = min * min;
      for (let i = 0; i < balls.length; i++) {
        if (balls[i].sinking > 0) continue;
        for (let j = i + 1; j < balls.length; j++) {
          if (balls[j].sinking > 0) continue;
          const a = balls[i];
          const c = balls[j];
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < min2 && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            const overlap = (min - d) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            c.x += nx * overlap;
            c.y += ny * overlap;
            const dvx = a.vx - c.vx;
            const dvy = a.vy - c.vy;
            const p = dvx * nx + dvy * ny;
            if (p > 0) continue;
            a.vx -= p * nx;
            a.vy -= p * ny;
            c.vx += p * nx;
            c.vy += p * ny;
          }
        }
      }

      for (const b of balls) drawBall(b);

      cueCtx.clearRect(0, 0, width, height);
      if (mouse.active) drawCue(mouse.x, mouse.y, cueAngle);

      raf = requestAnimationFrame(step);
    }

    step();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={tableCanvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -1 }}
      />
      <canvas
        ref={cueCanvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
      />
    </>
  );
}
