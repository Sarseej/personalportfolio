"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useModelStore } from "@/lib/store/useModelStore";
import { forwardPatched } from "@/lib/model/toyTransformer";
import type { AttentionPatterns } from "@/lib/model/toyTransformer";
import { tokenToLetter } from "@/lib/model/tokenDisplay";

const INDUCTION_HEADS = [0, 2, 3];
const BG = "#050508";
const ACCENT = "#3b82f6";

interface Vec2 {
  x: number;
  y: number;
}

interface Particle {
  i: number;
  j: number;
  weight: number;
  speed: number;
  phase: number;
}

function computePositions(T: number, w: number, h: number): Vec2[] {
  const mx = Math.min(80, w * 0.08);
  const usable = w - 2 * mx;
  return Array.from({ length: T }, (_, i) => {
    const t = T > 1 ? i / (T - 1) : 0.5;
    return {
      x: mx + t * usable,
      y:
        h * 0.48 +
        Math.sin(t * Math.PI * 1.5 - 0.3) * h * 0.08,
    };
  });
}

function computeArcWeight(
  patterns: AttentionPatterns,
  i: number,
  j: number,
  activeHeads: Set<number>,
): number {
  let w = 0;
  for (const h of INDUCTION_HEADS) {
    if (activeHeads.has(h)) {
      w += patterns[1][h][i][j];
    }
  }
  return w;
}

function computeParticles(
  patterns: AttentionPatterns,
  T: number,
  activeHeads: Set<number>,
): Particle[] {
  const arcs: { i: number; j: number; weight: number }[] = [];
  for (let i = 1; i < T; i++) {
    for (let j = 0; j < i; j++) {
      const w = computeArcWeight(patterns, i, j, activeHeads);
      if (w > 0.008) arcs.push({ i, j, weight: w });
    }
  }
  arcs.sort((a, b) => b.weight - a.weight);

  const particles: Particle[] = [];
  const top = arcs.slice(0, 25);
  let idx = 0;
  for (const arc of top) {
    const n = arc.weight > 0.08 ? 3 : arc.weight > 0.025 ? 2 : 1;
    for (let p = 0; p < n; p++) {
      particles.push({
        i: arc.i,
        j: arc.j,
        weight: arc.weight,
        speed: 0.12 + arc.weight * 0.4,
        phase: (idx * 0.618) % 1,
      });
      idx++;
    }
  }
  return particles;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tokens: number[],
  patterns: AttentionPatterns,
  positions: Vec2[],
  activeHeads: Set<number>,
  particles: Particle[],
  time: number,
  patchAlpha: number,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const T = tokens.length;

  const arcs: { i: number; j: number; weight: number }[] = [];
  for (let i = 1; i < T; i++) {
    for (let j = 0; j < i; j++) {
      const raw = computeArcWeight(patterns, i, j, activeHeads);
      if (raw > 0.001) arcs.push({ i, j, weight: raw });
    }
  }
  arcs.sort((a, b) => a.weight - b.weight);

  ctx.save();
  for (const arc of arcs) {
    const pi = positions[arc.i];
    const pj = positions[arc.j];
    const aw = arc.weight * patchAlpha;
    if (aw < 0.001) continue;

    const mx = (pi.x + pj.x) / 2;
    const my = (pi.y + pj.y) / 2;
    const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
    const cpY = my - dist * 0.22;

    const alpha = Math.min(0.85, aw * 2.2);
    const lw = 0.3 + aw * 2.8;

    ctx.beginPath();
    ctx.moveTo(pj.x, pj.y);
    ctx.quadraticCurveTo(mx, cpY, pi.x, pi.y);
    ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
    ctx.lineWidth = lw;
    ctx.shadowColor = `rgba(59, 130, 246, ${alpha * 0.4})`;
    ctx.shadowBlur = 3 + aw * 6;
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  for (const p of particles) {
    const t = (p.phase + time * p.speed) % 1;
    const pi = positions[p.i];
    const pj = positions[p.j];
    const mx = (pi.x + pj.x) / 2;
    const my = (pi.y + pj.y) / 2;
    const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
    const cpY = my - dist * 0.22;

    const u = 1 - t;
    const px = u * u * pj.x + 2 * u * t * mx + t * t * pi.x;
    const py = u * u * pj.y + 2 * u * t * cpY + t * t * pi.y;

    const alpha = Math.min(0.9, p.weight * patchAlpha * 3);
    if (alpha < 0.01) continue;
    const r = 1 + p.weight * 1.5;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(140, 180, 255, ${alpha})`;
    ctx.shadowColor = `rgba(59, 130, 246, ${alpha * 0.7})`;
    ctx.shadowBlur = 5;
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < T; i++) {
    const p = positions[i];

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#c8ccd4";
    ctx.fill();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = "rgba(200, 204, 212, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText(tokenToLetter(tokens[i]), p.x, p.y + 15);
  }
  ctx.restore();
}

const btnBase: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#c8ccd4",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
};

export default function AttentionField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const weights = useModelStore((s) => s.weights);
  const patterns = useModelStore((s) => s.patterns);
  const demoSequence = useModelStore((s) => s.demoSequence);
  const loadWeights = useModelStore((s) => s.loadWeights);
  const regenerateDemo = useModelStore((s) => s.regenerateDemo);

  const [activeHeads, setActiveHeads] = useState<Set<number>>(
    () => new Set(INDUCTION_HEADS),
  );
  const [patchAlpha, setPatchAlpha] = useState(1);
  const [patchRecovery, setPatchRecovery] = useState<number | null>(null);

  const tokens = demoSequence.tokens;
  const T = tokens.length;

  const patternsRef = useRef(patterns);
  const tokensRef = useRef(tokens);
  const activeHeadsRef = useRef(activeHeads);
  const patchAlphaRef = useRef(patchAlpha);

  useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);
  useEffect(() => {
    activeHeadsRef.current = activeHeads;
  }, [activeHeads]);
  useEffect(() => {
    patchAlphaRef.current = patchAlpha;
  }, [patchAlpha]);

  const particles = useMemo(() => {
    if (!patterns) return [];
    return computeParticles(patterns, T, activeHeads);
  }, [patterns, T, activeHeads]);
  const particlesRef = useRef(particles);
  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      time += dt;

      const cvs = canvasRef.current;
      if (!cvs) {
        animRef.current = requestAnimationFrame(frame);
        return;
      }
      const ctx2 = cvs.getContext("2d");
      if (!ctx2) {
        animRef.current = requestAnimationFrame(frame);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = cvs.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;

      if (
        cvs.width !== Math.round(cw * dpr) ||
        cvs.height !== Math.round(ch * dpr)
      ) {
        cvs.width = Math.round(cw * dpr);
        cvs.height = Math.round(ch * dpr);
        ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const p = patternsRef.current;
      const tok = tokensRef.current;
      if (p && tok.length > 0) {
        const pos = computePositions(tok.length, cw, ch);
        drawFrame(
          ctx2,
          cw,
          ch,
          tok,
          p,
          pos,
          activeHeadsRef.current,
          particlesRef.current,
          time,
          patchAlphaRef.current,
        );
      } else {
        ctx2.fillStyle = BG;
        ctx2.fillRect(0, 0, cw, ch);
      }

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    loadWeights();
  }, [loadWeights]);

  const handleRegenerate = useCallback(() => {
    setPatchAlpha(1);
    setPatchRecovery(null);
    regenerateDemo();
  }, [regenerateDemo]);

  const handleToggleHead = useCallback((h: number) => {
    setActiveHeads((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }, []);

  const handlePatch = useCallback(() => {
    if (!weights) return;

    const seq = useModelStore.getState().demoSequence;
    const corrupted = [...seq.tokens];
    const firstTok = corrupted[seq.patternStart1];
    const replacement = (firstTok + 1) % 20;
    for (let k = 0; k < seq.patternLen; k++) {
      corrupted[seq.patternStart1 + k] = replacement;
    }

    const firstOcc = Array.from(
      { length: seq.patternLen },
      (_, i) => seq.patternStart1 + i,
    );
    const result = forwardPatched(
      weights,
      seq.tokens,
      corrupted,
      { layer: 0, positions: firstOcc },
    );

    const target = seq.tokens[seq.patternStart2];
    const cleanLogit = result.cleanLogits[target];
    const corruptedLogit = result.corruptedLogits[target];
    const patchedLogit = result.patchedLogits?.[target] ?? corruptedLogit;

    const totalEffect = cleanLogit - corruptedLogit;
    const recovered = patchedLogit - corruptedLogit;
    const recoveryPct =
      Math.abs(totalEffect) > 1e-10 ? (recovered / totalEffect) * 100 : 0;

    setPatchAlpha(0.15);
    setPatchRecovery(null);

    setTimeout(() => {
      const targetAlpha = Math.max(0.15, recoveryPct / 100);
      setPatchAlpha(targetAlpha);
      setPatchRecovery(recoveryPct);
    }, 600);
  }, [weights]);

  if (!patterns) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BG,
          color: "#666",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
        }}
      >
        {weights === null
          ? "Loading model weights..."
          : "Computing attention patterns..."}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button onClick={handleRegenerate} style={btnBase}>
            Regenerate
          </button>

          {INDUCTION_HEADS.map((h) => (
            <button
              key={h}
              onClick={() => handleToggleHead(h)}
              style={{
                ...btnBase,
                border: `1px solid ${activeHeads.has(h) ? ACCENT : "rgba(255,255,255,0.12)"}`,
                background: activeHeads.has(h)
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(255,255,255,0.04)",
                color: activeHeads.has(h) ? ACCENT : "#666",
              }}
            >
              L1H{h}
            </button>
          ))}

          <div
            style={{
              width: 1,
              height: 20,
              background: "rgba(255,255,255,0.1)",
            }}
          />

          <button onClick={handlePatch} style={btnBase}>
            Patch
          </button>
        </div>

        {patchRecovery !== null && (
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color:
                Math.abs(patchRecovery) > 50
                  ? "#22c55e"
                  : Math.abs(patchRecovery) > 10
                    ? "#f59e0b"
                    : "#666",
            }}
          >
            Logit-diff recovery:{" "}
            {patchRecovery > 0 ? "+" : ""}
            {patchRecovery.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
