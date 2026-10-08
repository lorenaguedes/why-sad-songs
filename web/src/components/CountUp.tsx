import { useEffect, useState } from 'react';
import * as d3 from 'd3';

export function CountUp({ value, active, suffix = '' }: { value: number; active: boolean; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = d3.timer((el) => {
      setV(value * d3.easeCubicOut(Math.min(1, el / 1400)));
      if (el >= 1400) t.stop();
    });
    return () => t.stop();
  }, [active, value]);
  return <span>{Math.round(v).toLocaleString()}{suffix}</span>;
}