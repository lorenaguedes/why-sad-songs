import { useEffect, useRef, useState } from 'react';

// Returns the index of the step whose block is crossing the middle of the screen.
export function useActiveStep(count: number) {
  const [active, setActive] = useState(0);
  const els = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }),
      { rootMargin: '-45% 0px -45% 0px' } // a thin band across the middle of the viewport
    );
    els.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);

  const setRef = (i: number) => (el: HTMLElement | null) => {
    els.current[i] = el;
  };
  return { active, setRef };
}