import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { K, farSadIds, type StepView, type Track } from '../steps';

const MOOD: Record<string, string> = { Sad: '#60a5fa', Happy: '#fbbf24', Dark: '#a78bfa' };
const CLUSTER = ['#f43f5e', '#22c55e', '#f97316', '#14b8a6'];
const NEUTRAL = '#64748b';
const PAD = 24;
const F = 7; // alpha, radius, r, g, b, x, y
const energyScale = d3.scaleSequential(d3.interpolatePlasma).domain([0, 1]);
const reduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CASES = [
  { id: 'track_1289381', text: 'Tagged sad. Measures loud.' },
  { id: 'track_1300500', text: 'The quietest of the set, yet in the bright group.' },
  { id: 'track_1365120', text: 'The loudest of the set. Tagged sad.' },
];

const baseColor = (d: Track, v: StepView) =>
  v.color === 'neutral' ? NEUTRAL
    : v.color === 'mood' ? MOOD[d.mood_label] ?? NEUTRAL
      : v.color === 'energy' ? energyScale(d.energy_rms_norm ?? 0)
        : CLUSTER[d.cluster];


type Props = { data: Track[]; view: StepView; clusterNames?: string[]; width?: number; height?: number; filter?: string; randomTick?: number; };

export function MusicalUniverse({
  data, view, clusterNames, width = 1000, height = 750, filter = 'All', randomTick = 0, }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hover = useRef(-1);
  const started = useRef(false);
  const state = useRef(new Float32Array(0));
  const tween = useRef<{ from: Float32Array; to: Float32Array; t0: number; first: boolean } | null>(null);
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
  if (state.current.length !== data.length * F) state.current = new Float32Array(data.length * F);

  const [playable, setPlayable] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  type Credit = { title: string; artist: string; license: string; url: string };
  const [credits, setCredits] = useState<Record<string, Credit>>({});

  useEffect(() => {
    d3.json<Record<string, Credit>>('/data/credits.json').then((c) => setCredits(c ?? {}));
  }, []);

  useEffect(() => {
    d3.json<string[]>('/data/audio_ids.json').then((a) => setPlayable(new Set(a ?? [])));
    return () => audio.current?.pause();
  }, []);

const play = (id: string) => {
    audio.current?.pause();
    if (playing === id) { setPlaying(null); return; } 
    const numericId = id.replace('track_', '');
    const a = new Audio(`https://mp3l.jamendo.com/?trackid=${numericId}&format=mp31`);
    
    a.volume = 0.7;
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
    audio.current = a;
    setPlaying(id);
  };

  const names = clusterNames ?? d3.range(K).map((c) => `Group ${'ABCDEFGH'[c]}`);

  const geo = useMemo(() => {
    const range = (f: (d: Track) => number) => {
      const v = data.map(f).sort(d3.ascending);
      return [d3.quantile(v, 0.01)!, d3.quantile(v, 0.99)!] as [number, number];
    };
    const sx = d3.scaleLinear().domain(range((d) => d.pca_x)).range([PAD, width - PAD]).nice().clamp(true);
    const sy = d3.scaleLinear().domain(range((d) => d.pca_y)).range([height - PAD, PAD]).nice().clamp(true);
    const mapX = data.map((d) => sx(d.pca_x));
    const mapY = data.map((d) => sy(d.pca_y));
    const cents = d3.range(K).map((c) => {
      const pts = data.filter((d) => d.cluster === c);
      return { c, x: sx(d3.median(pts, (d) => d.pca_x) ?? 0), y: sy(d3.median(pts, (d) => d.pca_y) ?? 0) };
    });
    const labels = cents.map((c) => ({ ...c }));
    for (let iter = 0; iter < 10; iter++) {
      for (let a = 0; a < labels.length; a++) {
        for (let b = a + 1; b < labels.length; b++) {
          const dy = labels[b].y - labels[a].y;
          const dx = Math.abs(labels[b].x - labels[a].x);
          if (dx < 170 && Math.abs(dy) < 34) {
            const push = (34 - Math.abs(dy)) / 2 + 1;
            const dir = dy >= 0 ? 1 : -1;
            labels[a].y -= push * dir;
            labels[b].y += push * dir;
          }
        }
      }
    }
    const rng = d3.randomLcg(7); // aleatório, mas sempre o mesmo
    const scatterX = data.map(() => PAD + rng() * (width - 2 * PAD));
    const scatterY = data.map(() => PAD + rng() * (height - 2 * PAD));
    const PULL = 0.55; // quanto cada ponto é puxado para o centro do seu cluster
    const pullX = data.map((d, i) => mapX[i] + (cents[d.cluster].x - mapX[i]) * PULL);
    const pullY = data.map((d, i) => mapY[i] + (cents[d.cluster].y - mapY[i]) * PULL);
    return {
      layouts: {
        scatter: { x: scatterX, y: scatterY },
        map: { x: mapX, y: mapY },
        pull: { x: pullX, y: pullY },
      },
      cents,
      labels,
      far: farSadIds(data),
    };
  }, [data, width, height]);

  useEffect(() => {
    if (randomTick === 0) return;
    const pool = data
      .map((d, i) => ({ id: d.track_id, i }))
      .filter((o) => geo.far.has(o.id) && playable.has(o.id) && o.id !== playing);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    play(pick.id);
    hover.current = pick.i;
    const s = state.current;
    setTip({ i: pick.i, x: (s[pick.i * F + 5] / width) * 100, y: (s[pick.i * F + 6] / height) * 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomTick]);

  const callouts = useMemo(
    () => CASES.map((c) => ({ ...c, i: data.findIndex((d) => d.track_id === c.id) })).filter((c) => c.i >= 0),
    [data]
  );

  const draw = useCallback(
    (now: number) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const s = state.current;
      const amp = reduced ? 0 : 1.1;
      const pos = (i: number): [number, number] => [
        s[i * F + 5] + Math.sin(now / 1100 + i * 1.7) * amp, // "respiração" ambiente
        s[i * F + 6] + Math.cos(now / 1300 + i * 2.3) * amp,
      ];
      for (let i = 0; i < data.length; i++) {
        const a = s[i * F];
        if (a < 0.01) continue;
        const [x, y] = pos(i);
        ctx.globalAlpha = a;
        ctx.fillStyle = `rgb(${s[i * F + 2] | 0},${s[i * F + 3] | 0},${s[i * F + 4] | 0})`;
        ctx.beginPath();
        ctx.arc(x, y, s[i * F + 1], 0, Math.PI * 2);
        ctx.fill();
      }
      const h = hover.current;
      if (h >= 0) {
        const [x, y] = pos(h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    [data, width, height]
  );

  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = width * dpr;
    cv.height = height * dpr;
  }, [width, height]);

  // Alvo de cada passo: cor, opacidade, tamanho E posição
  useEffect(() => {
    const n = data.length;
    const s = state.current;
    const L = geo.layouts[view.layout];
    const to = new Float32Array(n * F);
    data.forEach((d, i) => {
      const on =
        view.focus === 'all' ||
        (view.focus === 'sad'
          ? d.mood_label === 'Sad'
          : view.focus === 'far'
            ? geo.far.has(d.track_id) && playable.has(d.track_id)
            : filter === 'All' || d.mood_label === filter);
      const c = d3.rgb(baseColor(d, view));
      to.set([on ? 0.85 : 0.07, on ? (view.focus === 'far' ? 6 : 3.5) : 2.5, c.r, c.g, c.b, L.x[i], L.y[i]], i * F);
    });
    const first = !started.current;
    started.current = true;
    if (first) for (let i = 0; i < n; i++) { s[i * F + 5] = to[i * F + 5]; s[i * F + 6] = to[i * F + 6]; }
    tween.current = { from: Float32Array.from(s), to, t0: performance.now(), first };
  }, [data, view, geo, playable, filter]);

  useEffect(() => {
    const n = data.length;
    const s = state.current;
    const mx = geo.layouts.map.x;
    const [x0, x1] = d3.extent(mx) as [number, number];
    const dur = 900;
    const timer = d3.timer(() => {
      const now = performance.now();
      const tw = tween.current;
      if (tw) {
        const el = now - tw.t0;
        const spread = tw.first ? 700 : 350; // onda da esquerda para a direita
        for (let i = 0; i < n; i++) {
          const delay = ((mx[i] - x0) / (x1 - x0 || 1)) * spread;
          const t = d3.easeCubicInOut(Math.min(1, Math.max(0, (el - delay) / dur)));
          for (let k = 0; k < F; k++) s[i * F + k] = tw.from[i * F + k] + (tw.to[i * F + k] - tw.from[i * F + k]) * t;
        }
        if (el > dur + spread) tween.current = null;
      }
      draw(now);
    });
    return () => timer.stop();
  }, [data, geo, draw]);

  const pointerKind = useRef<'mouse' | 'touch'>('mouse');

  const pick = (clientX: number, clientY: number, el: HTMLCanvasElement, reachPx: number) => {
    const r = el.getBoundingClientRect();
    const mx = ((clientX - r.left) * width) / r.width;
    const my = ((clientY - r.top) * height) / r.height;
    const reach = reachPx * (width / r.width);
    const s = state.current;
    let next = -1, best = reach * reach;
    for (let i = 0; i < data.length; i++) {
      if (s[i * F] < 0.3) continue; // ignora pontos apagados
      const d2 = (s[i * F + 5] - mx) ** 2 + (s[i * F + 6] - my) ** 2;
      if (d2 < best) { best = d2; next = i; }
    }
    return next;
  };

  const select = (i: number) => {
    if (i === hover.current) return;
    hover.current = i;
    const s = state.current;
    setTip(i >= 0 ? { i, x: (s[i * F + 5] / width) * 100, y: (s[i * F + 6] / height) * 100 } : null);
  };

  return (
    <div
      className="relative mx-auto w-[min(100%,calc(38vh*1.3333))] lg:w-[min(100%,calc(70vh*1.3333))]"
      style={{ aspectRatio: `${width}/${height}` }}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-crosshair rounded-xl border border-slate-800 bg-slate-900"
        onPointerDown={(e) => { pointerKind.current = e.pointerType === 'mouse' ? 'mouse' : 'touch'; }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return;
          select(pick(e.clientX, e.clientY, e.currentTarget, 12));
        }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') select(-1); }}
        onClick={(e) => {
          const i = pick(e.clientX, e.clientY, e.currentTarget, pointerKind.current === 'touch' ? 28 : 12);
          if (pointerKind.current === 'touch') select(i);
          if (i >= 0 && playable.has(data[i].track_id)) play(data[i].track_id);
        }}
      />

      {geo.labels.map((c) => (
        <div
          key={c.c}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-slate-900/90 px-3 py-1 font-serif text-sm shadow-lg backdrop-blur-sm transition-opacity duration-700"
          style={{
            left: `${(c.x / width) * 100}%`,
            top: `${(c.y / height) * 100}%`,
            opacity: view.centroids ? 1 : 0,
            color: CLUSTER[c.c],
            borderColor: CLUSTER[c.c],
          }}
        >
          {names[c.c]}
        </div>
      ))}

      {/* Callouts nos casos estranhos */}
      {callouts.map(({ id, i, text }, k) => (
        <div
          key={id}
          className="pointer-events-none absolute transition-all duration-700"
          style={{
            left: `${(geo.layouts.map.x[i] / width) * 100}%`,
            top: `${(geo.layouts.map.y[i] / height) * 100}%`,
            opacity: view.focus === 'far' ? 1 : 0,
            transitionDelay: view.focus === 'far' ? `${900 + k * 250}ms` : '0ms',
          }}
        >
          <span className="absolute -left-3 -top-3 h-6 w-6 animate-ping rounded-full border border-slate-100/70" />
          <span
            className={`absolute top-3 w-28 text-xs leading-snug text-slate-200 sm:w-40 ${geo.layouts.map.x[i] / width > 0.6
              ? 'right-4 border-r border-slate-400/60 pr-2 text-right'
              : 'left-4 border-l border-slate-400/60 pl-2'
              }`}
          >
            {text}
          </span>
        </div>
      ))}

      {tip && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700 bg-slate-800/95 px-3 py-2 text-sm shadow-xl" style={{ left: `${Math.min(80, Math.max(20, tip.x))}%`, top: `calc(${tip.y}% - 12px)` }}>
          {credits[data[tip.i].track_id] && (
            <div className="text-slate-100">
              <span className="font-serif">{credits[data[tip.i].track_id].title}</span>
              {' · '}{credits[data[tip.i].track_id].artist}
            </div>
          )}

          <div className="text-slate-400">
            Tagged {data[tip.i].mood_label.toLowerCase()}, in {names[data[tip.i].cluster]}
          </div>

          {playable.has(data[tip.i].track_id) && (
            <div className="mt-1 text-xs text-amber-300">
              {playing === data[tip.i].track_id ? 'Playing… click to stop' : '▶ Tap or click to listen'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}