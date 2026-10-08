import * as d3 from 'd3';

export type Track = {
  track_id: string;
  pca_x: number;
  pca_y: number;
  cluster: number;
  mood_label: string;
  energy_rms_norm?: number;
};

export type StepView = {
  color: 'neutral' | 'mood' | 'cluster' | 'energy';
  focus: 'all' | 'sad' | 'far' | 'filter';
  layout: 'scatter' | 'map' | 'pull';
  centroids: boolean;
};

export const K = 4; 

export const VIEWS: StepView[] = [
  { color: 'neutral', focus: 'all', layout: 'scatter', centroids: false },
  { color: 'neutral', focus: 'all', layout: 'map', centroids: false },
  { color: 'energy', focus: 'all', layout: 'map', centroids: false },
  { color: 'mood', focus: 'all', layout: 'map', centroids: false },
  { color: 'mood', focus: 'sad', layout: 'map', centroids: false },
  { color: 'cluster', focus: 'all', layout: 'pull', centroids: true },
  { color: 'cluster', focus: 'sad', layout: 'map', centroids: true },
  { color: 'mood', focus: 'far', layout: 'map', centroids: false },
  { color: 'mood', focus: 'filter', layout: 'map', centroids: false }, 
  { color: 'neutral', focus: 'all', layout: 'map', centroids: false }, 
];

const corr = (a: number[], b: number[]) => {
  const ma = d3.mean(a)!, mb = d3.mean(b)!;
  return d3.sum(a, (v, i) => (v - ma) * (b[i] - mb)) /
    Math.sqrt(d3.sum(a, (v) => (v - ma) ** 2) * d3.sum(b, (v) => (v - mb) ** 2));
};

export function farSadIds(data: Track[]): Set<string> {
  const sad = data.filter((d) => d.mood_label === 'Sad');
  if (!sad.length) return new Set();
  const mx = d3.median(sad, (d) => d.pca_x)!;
  const my = d3.median(sad, (d) => d.pca_y)!;
  const dist = sad.map((d) => Math.hypot(d.pca_x - mx, d.pca_y - my));
  const cut = d3.quantile([...dist].sort(d3.ascending), 0.95)!;
  return new Set(sad.filter((_, i) => dist[i] >= cut).map((d) => d.track_id));
}

export function computeStats(data: Track[]) {
  const sad = data.filter((d) => d.mood_label === 'Sad');
  const count = (m: string) => data.filter((d) => d.mood_label === m).length;
  const perCluster = d3.rollup(sad, (v) => v.length, (d) => d.cluster);
  const shares = d3.range(K).map((c) => (perCluster.get(c) ?? 0) / (sad.length || 1));
  const topCluster = shares.indexOf(Math.max(...shares));
  return {
    n: data.length,
    nSad: sad.length,
    nHappy: count('Happy'),
    nDark: count('Dark'),
    shares,
    topCluster,
    topShare: shares[topCluster] ?? 0,
    farN: farSadIds(data).size,
    rEnergyX: corr(
      data.map((d) => d.pca_x),
      data.map((d) => d.energy_rms_norm ?? 0)
    ),   
  };
}

export type Stats = ReturnType<typeof computeStats>;