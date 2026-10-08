import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const COLORS = ['#60a5fa', '#fbbf24', '#a78bfa'];
const N = 700;
const reduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    let w = 0, h = 0, scrollY = window.scrollY;
    const resize = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });

    const rng = d3.randomLcg(11);
    const pts = d3.range(N).map(() => ({
      hx: rng(), hy: rng(), ph: rng() * Math.PI * 2,
      r: 1.5 + rng() * 2, col: COLORS[Math.floor(rng() * 3)],
    }));

    const timer = d3.timer((t0) => {
      const t = reduced ? 0 : t0;
      const ctx = cv.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // organiza nos primeiros 35% da altura do cabeçalho, some depois
      const org = d3.easeCubicInOut(Math.min(1, scrollY / (h * 0.35)));
      const fade = 1 - Math.min(1, Math.max(0, (scrollY - h * 0.35) / (h * 0.5)));
      if (fade <= 0) return;
      pts.forEach((q, i) => {
        const cx = q.hx * w + Math.sin(t / 2300 + q.ph) * 18 + Math.sin(t / 900 + i) * 3;
        const cy = q.hy * h + Math.cos(t / 2700 + q.ph * 1.3) * 18 + Math.cos(t / 1100 + i) * 3;
        const env = Math.sin(q.hx * Math.PI);
        const wy = h * 0.5 + Math.sin(q.hx * Math.PI * 6 + t / 600) * h * 0.18 * env + (q.hy - 0.5) * 14;
        ctx.globalAlpha = (0.3 + 0.4 * org) * fade;
        ctx.fillStyle = q.col;
        ctx.beginPath();
        ctx.arc(cx + (q.hx * w - cx) * org, cy + (wy - cy) * org, q.r, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    return () => {
      timer.stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}