import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { MusicalUniverse } from './components/MusicalUniverse';
import { HeroCanvas } from './components/HeroCanvas';
import { CountUp } from './components/CountUp';
import { useActiveStep } from './useActiveStep';
import { VIEWS, computeStats, type Stats, type Track } from './steps';

type Credit = { title: string; artist: string; license: string; url: string };
type Step = {
  title: string;
  body: string;
  big?: { value: number; suffix?: string; label: string };
  explore?: boolean;
};

const NAMES = ['Quiet & fast', 'Quiet & bright', 'Loud', 'Slow & dark'];
const FILTERS = ['All', 'Sad', 'Happy', 'Dark'];
const FILTER_COLOR: Record<string, string> = {
  All: '#94a3b8', Sad: '#60a5fa', Happy: '#fbbf24', Dark: '#a78bfa',
};
const pct = (x: number) => `${Math.round(x * 100)}%`;

function buildSteps(s: Stats): Step[] {
  const top2 = [...s.shares].sort((a, b) => b - a).slice(0, 2);
  return [
    {
      title: 'Every dot is a song.',
      big: { value: s.n, label: 'songs' },
      body: `Right now they are scattered at random, because we haven't told the computer anything yet. Keep scrolling.`
    },
    {
      title: 'Sound gives them a place.',
      body: `We measured four things in each track: how loud, how fast, how bright, how noisy. Then we squeezed those four numbers into two, so every song gets an address. Songs that sound alike become neighbors.`
    },
    {
      title: 'The map is not random.',
      body: `The horizontal axis isn't just a mathematical trick. Energy and this hidden dimension correlate at ${s.rEnergyX.toFixed(2)} (Pearson r). The map learned a strong energy gradient without ever being told what "energy" meant.`
    },
    {
      title: 'Now add what the uploaders say.',
      body: `Every track also carries a mood tag, chosen by whoever uploaded it: ${s.nSad} Sad, ${s.nHappy} Happy, ${s.nDark} Dark. The tag is the uploader's label, and the position is math. What happens when the two disagree?`
    },
    {
      title: 'Where do the sad ones land?',
      big: { value: Math.round(s.topShare * 100), suffix: '%', label: `of sad-tagged songs sit in "${NAMES[s.topCluster]}"` },
      body: `Everything else fades. The other ${pct(1 - s.topShare)} are somewhere else entirely.`
    },
    {
      title: 'We drew four neighborhoods.',
      body: `We asked K-Means to divide the map into 4 groups without showing it a single tag. It found four broad musical profiles: one loud, one slow and dark, one quiet and fast, one quiet and bright. But the boundaries are fuzzy (silhouette 0.25 out of 1), so think neighborhoods, not countries. Two of them, "slow & dark" and "quiet & fast", sit almost on top of each other here because they differ mostly in tempo, which a 2D map squashes.`
    },
    {
      title: 'Sad is not one place.',
      big: { value: Math.round((top2[0] + top2[1]) * 100), suffix: '%', label: 'of sad-tagged songs live in the two quiet, dark groups', },
      body: `Rounded, about ${pct(top2[0] + top2[1])} in just two groups. But the rest are scattered: ${NAMES.map((g, c) => `${pct(s.shares[c])} in ${g}`).join(', ')}. And it runs the other way too: more than half of the songs in the slow, dark group were not tagged sad at all.`
    },
    {
      title: 'And then there are the strange ones.',
      body: `${s.farN} sad-tagged songs sit far from the typical sad song. We can play 20 of them, the ones whose licenses allow it. Sadness (Raw Version) has more than three times the energy of the average slow, dark song. Endless Journey is the quietest of the twenty, yet lands among the bright ones. Rays of hope is the loudest, and it is tagged sad. Maybe the tags capture something the audio features don't. Maybe four numbers simply can't hear sadness.`
    },
    {
      title: 'Your turn.',
      explore: true,
      body: `Filter by the tag the uploader gave, or let us pick one of the strange ones for you. Each was tagged sad. The audio measured something else. Listen, then decide who you believe.`
    },
    {
      title: 'So, why do we listen to sad songs?',
      body: `We can't tell you. Everything here measures sound: four numbers per song, squeezed onto a map. Nothing here measures why anyone presses play. Researchers have proposed several ideas, such as comfort, nostalgia, empathy, or the pleasure of being moved, and this map can test none of them. What it does show is smaller, and still real: a sad tag does not point to one sound. Sad-tagged songs live in every region of the map, loud ones included. Maybe sadness is something we bring to a song as much as something the song carries.`
    },
  ];
}

function ProgressBar() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  return (
    <div
      className="fixed left-0 top-0 z-50 h-0.5 bg-gradient-to-r from-blue-400 via-violet-400 to-amber-300"
      style={{ width: `${p * 100}%` }}
    />
  );
}

export default function App() {
  const [data, setData] = useState<Track[]>([]);
  const [credits, setCredits] = useState<Record<string, Credit>>({});
  const [filter, setFilter] = useState('All');
  const [randomTick, setRandomTick] = useState(0);

  useEffect(() => {
    d3.json<Track[]>('/data/universe.json').then((d) => setData(d ?? []));
    d3.json<Record<string, Credit>>('/data/credits.json').then((c) => setCredits(c ?? {}));
  }, []);

  const stats = useMemo(() => computeStats(data), [data]);
  const steps = useMemo(() => (data.length ? buildSteps(stats) : []), [data, stats]);
  const { active, setRef } = useActiveStep(steps.length);

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-900 font-sans text-slate-50 selection:bg-blue-500/30">
      <ProgressBar />

      <header className="relative overflow-hidden">
        <HeroCanvas />
        <div className="relative mx-auto max-w-3xl px-6 pb-48 pt-32">
          <h1 className="mb-6 font-serif text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Why do we listen to sad songs?
          </h1>
          <p className="text-xl leading-relaxed text-slate-400">
            We all know what a sad song sounds like. Can we measure it?
          </p>
          <p className="mt-16 animate-bounce text-sm uppercase tracking-widest text-slate-500">Scroll ↓</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-32">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            {steps.map((s, i) => (
              <section key={s.title} data-step={i} ref={setRef(i)} className="flex min-h-[65vh] items-center lg:min-h-[85vh]">
                <div className={`transition-opacity duration-500 ${active === i ? 'opacity-100' : 'opacity-25'}`}>
                  {s.big && (
                    <div className="mb-6">
                      <div className="font-serif text-7xl font-bold leading-none text-slate-50">
                        <CountUp value={s.big.value} suffix={s.big.suffix} active={active === i} />
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-widest text-slate-500">{s.big.label}</div>
                    </div>
                  )}
                  <h2 className="mb-4 font-serif text-3xl text-slate-100">{s.title}</h2>
                  <p className="text-lg leading-relaxed text-slate-400">{s.body}</p>

                  {s.explore && (
                    <div className="mt-6 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {FILTERS.map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="rounded-full border px-4 py-1.5 text-sm transition-colors"
                            style={{
                              borderColor: FILTER_COLOR[f],
                              color: filter === f ? '#0f172a' : FILTER_COLOR[f],
                              backgroundColor: filter === f ? FILTER_COLOR[f] : 'transparent',
                            }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => { setFilter('Sad'); setRandomTick((t) => t + 1); }}
                        className="rounded-lg border border-amber-300/60 px-4 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-300/10"
                      >
                        ▶ Play a random strange one
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="sticky top-0 z-20 order-first -mx-6 bg-slate-900 px-3 pb-2 pt-3 lg:static lg:order-none lg:col-span-8 lg:mx-0 lg:bg-transparent lg:p-0">
            <div className="lg:sticky lg:top-24">
              {data.length > 0 ? (
                <MusicalUniverse
                  data={data}
                  view={VIEWS[active]}
                  clusterNames={NAMES}
                  filter={filter}
                  randomTick={randomTick}
                />
              ) : (
                <div className="flex aspect-[4/3] w-full animate-pulse items-center justify-center rounded-xl bg-slate-800/20 text-slate-500">
                  Loading tracks
                </div>
              )}
              <div className="mt-4 hidden justify-between border-t border-slate-800 pt-4 text-xs text-slate-500 lg:flex">
                <span>Method: K-Means (k = 4) on four audio features; PCA only for the 2D map</span>
                <span>Tags: set by the uploader (MTG-Jamendo mood/theme), reduced to one per track</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="mx-auto max-w-3xl px-6 pb-16 text-sm leading-relaxed text-slate-400">
        <h2 className="mb-3 font-serif text-xl text-slate-300">Methods and limits</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><b className="text-slate-300">Data.</b> 2,400 tracks from the MTG-Jamendo dataset, sampled to 800 per group. Each track gets one tag: tracks tagged both sad and happy were left out, tracks tagged sad and dark count as sad, tracks tagged happy and dark count as happy, and "dark" means dark without sad or happy. This balance is by design, so the share of sad tracks here says nothing about music in general.</li>
          <li><b className="text-slate-300">Tags.</b> Mood/theme tags in MTG-Jamendo are provided by the uploaders (artists or labels), not by listeners. They express intent, are not standardized, and "dark" is a mood/theme label rather than an emotion.</li>
          <li><b className="text-slate-300">Audio features.</b> Computed on the first 30 seconds of each track: RMS energy (loud), estimated tempo (fast), spectral centroid (bright), zero-crossing rate (noisy). RMS depends on mastering, and automatic tempo estimates can be off by a factor of two. All four were normalized to 0–1.</li>
          <li><b className="text-slate-300">Playable tracks.</b> The tracks you can play stream directly from Jamendo and start from the beginning, while the audio features were measured on the first 30 seconds. Playback depends on Jamendo, so a track may stop working if it is removed there.</li>
          <li><b className="text-slate-300">Map.</b> PCA reduces the four features to two axes, keeping 78.7% of the variance. The remaining 21% is lost, so distances on the map are approximate.</li>
          <li><b className="text-slate-300">Groups.</b> K-Means with k = 4, run on the four normalized features. We chose 4 because it gives groups we can describe by their sound, not because the data demands it: the silhouette score is 0.25 at k = 4, and higher at k = 2 (0.30) and k = 3 (0.30). By the usual rule of thumb, a silhouette near 0.25 means little or no substantial structure, so the groups overlap heavily.</li>
          <li><b className="text-slate-300">Strange cases.</b> The 5% of sad-tagged tracks farthest from the median sad-tagged track on the 2D map. This is a rough proxy, and some may look far only because the map flattens four dimensions into two. We can play only those whose licenses allow it and that are still available on Jamendo.</li>
          <li><b className="text-slate-300">Artists.</b> Tracks by the same artist are not independent. Six of the twenty playable tracks involve one artist (Kara Square, with two different collaborators).</li>
          <li><b className="text-slate-300">Correlation.</b> The energy–axis figure is a Pearson r on all tracks.</li>
        </ul>
      </section>

      <footer className="mx-auto max-w-3xl px-6 pb-24 text-sm text-slate-500">
        <h2 className="mb-3 font-serif text-xl text-slate-300">Credits</h2>
        <p className="mb-4">
          Audio streamed from <a href="https://www.jamendo.com" className="underline hover:text-slate-300">Jamendo</a>,
          used for non-commercial research and education, with credit to the artists.
          Tags and audio features from the MTG-Jamendo dataset.
        </p>
        <ul className="space-y-1">
          {Object.values(credits).map((c) => (
            <li key={c.url}>
              <a href={c.url} className="underline hover:text-slate-300">{c.title}</a>, {c.artist},{' '}
              <a href={c.license} className="underline hover:text-slate-300">
                {c.license.match(/licenses\/([^/]+\/[^/]+)/)?.[1].toUpperCase()}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}