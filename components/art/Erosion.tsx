'use client';

import { useEffect, useRef } from 'react';
import { INK, css, mix, rng } from '@/lib/fingerprint';
import { ArtProps } from './types';

// A block made of the poem's own letters stands in a current of water.
// Strict meter makes the block large and solid; run-on verses erode it faster;
// every verse that breaks the meter opens a crack.

const CHAR_W = 7;
const CHAR_H = 9.4;

export default function Erosion({ fingerprint: fp, width, height }: ArtProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const cols = Math.max(20, Math.floor((width - 40) / CHAR_W));
    const rows = Math.max(12, Math.floor((height - 40) / CHAR_H));
    const letters = Array.from(fp.verses.map(v => v.text).join('').replace(/[\s¿¡?!.,;:—–"'“”‘’«»()[\]]/g, ''));
    if (!letters.length) letters.push('·');

    const bh = Math.round(rows * (0.35 + 0.35 * fp.meterRegularity));
    const bw = Math.min(cols - 4, Math.round(bh * (CHAR_H / CHAR_W)));
    const bx = Math.floor(cols / 2 - bw / 2);
    const by = Math.floor(rows / 2 - bh / 2);
    const maxInner = Math.ceil(Math.min(bw, bh) / 2);

    const erosionRate = 0.04 + fp.enjambment * 0.12;     // cells per second
    const flowSpeed = 0.3 + fp.turbulence * 1.4;
    const waveFreq = 0.1 + fp.dominantMeter * 0.012;
    const arms = Math.max(1, Math.min(6, fp.stanzaCount));
    const crackCount = Math.min(14, 2 + fp.anomalies * 2);

    const seeds = rng(fp.seed);
    const cracks = Array.from({ length: crackCount }, () => ({
      x: bx + Math.floor(seeds() * bw),
      y: by + Math.floor(seeds() * bh),
      len: 5 + Math.floor(seeds() * 10),
      salt: Math.floor(seeds() * 1e6),
    }));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const grid: string[][] = Array.from({ length: rows }, () => new Array<string>(cols).fill(' '));
    const start = performance.now();
    let raf = 0;
    let last = 0;

    const render = (now: number) => {
      if (!reduced) raf = requestAnimationFrame(render);
      if (now - last < 33) return; // ~30 fps is plenty for text
      last = now;
      const t = reduced ? 20 : (now - start) / 1000;

      // The block erodes, then quietly rebuilds: a cycle rather than an ending.
      const erosion = (t * erosionRate) % (maxInner + 6);
      const jitter = rng(fp.seed ^ Math.floor(t * 3));

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (x >= bx && x < bx + bw && y >= by && y < by + bh) {
            const inner = Math.min(x - bx, bx + bw - 1 - x, y - by, by + bh - 1 - y);
            const ch = letters[((y - by) * bw + (x - bx)) % letters.length];
            if (inner > erosion) grid[y][x] = ch;
            else if (inner > erosion - 2) grid[y][x] = jitter() > 0.75 ? ch : '·';
            else grid[y][x] = ' ';
          } else {
            const dx = x - cols / 2;
            const dy = (y - rows / 2) * (CHAR_H / CHAR_W);
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wave = Math.sin(dist * waveFreq - t * flowSpeed + angle * arms);
            const flow = Math.sin(x * 0.08 + y * 0.04 + t * flowSpeed * 0.4);
            const v = wave + flow;
            grid[y][x] = v > 0.5 ? '~' : v < -0.5 ? '·' : ' ';
          }
        }
      }

      for (const c of cracks) {
        const walk = rng(c.salt ^ Math.floor(t / 2));
        let cx = c.x;
        let cy = c.y;
        for (let j = 0; j < c.len; j++) {
          if (cx >= bx && cx < bx + bw && cy >= by && cy < by + bh) grid[cy][cx] = ' ';
          cx += Math.floor(walk() * 3) - 1;
          cy += Math.floor(walk() * 3) - 1;
        }
      }

      pre.textContent = grid.map(r => r.join('')).join('\n');
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      pre.textContent = '';
    };
  }, [fp, width, height]);

  return (
    <div
      style={{ width, height, background: '#faf8f4', overflow: 'hidden' }}
      className="flex items-center justify-center"
    >
      <pre
        ref={preRef}
        aria-hidden
        style={{
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          lineHeight: `${CHAR_H}px`,
          width: 'auto',
          letterSpacing: `${CHAR_W - 6.6}px`,
          color: css(mix(INK, fp.palette[0], 0.3), 0.85),
          userSelect: 'none',
        }}
      />
    </div>
  );
}
