'use client';

import { useEffect, useRef } from 'react';
import { INK, css, mix, rng } from '@/lib/fingerprint';
import { FieldColor } from '@/lib/poemParser';
import { ArtProps } from './types';

// A block made of the poem's own letters stands in a current of water.
// Strict meter makes the block large and solid; run-on verses erode it faster;
// every verse that breaks the meter opens a crack.

const CHAR_W = 7;
const CHAR_H = 9.4;

// Larger cells when the piece fills the whole viewport.
const STAGE_SCALE = 1.45;

export default function Erosion({ fingerprint: fp, width, height, stage }: ArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let cancelled = false;
    let teardown: (() => void) | null = null;

    const cellW = stage ? CHAR_W * STAGE_SCALE : CHAR_W;
    const cellH = stage ? CHAR_H * STAGE_SCALE : CHAR_H;
    const mono = stage?.theme.mono ?? 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const ink = stage?.theme.ink ?? INK;
    const tone = stage?.theme.tone ?? ((c: FieldColor) => c);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.max(20, Math.floor((width - 40) / cellW));
    const rows = Math.max(12, Math.floor((height - 40) / cellH));
    const clean = (txt: string) => Array.from(txt.replace(/[\s¿¡?!.,;:—–"'“”‘’«»()[\]]/g, ''));
    const letters = clean(fp.verses.map(v => v.text).join(''));
    // Which verse each letter came from, so the block can light up per verse.
    const letterVerse: number[] = [];
    fp.verses.forEach((v, vi) => clean(v.text).forEach(() => letterVerse.push(vi)));
    if (!letters.length) {
      letters.push('·');
      letterVerse.push(-1);
    }

    const bh = Math.round(rows * (0.35 + 0.35 * fp.meterRegularity));
    const bw = Math.min(cols - 4, Math.round(bh * (cellH / cellW)));
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
    const owner: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(-1));
    const start = performance.now();
    let raf = 0;
    let last = 0;

    const color = mix(ink, tone(fp.palette[0]), stage ? 0.45 : 0.3);
    let fontPx = 11;
    const ox = (width - cols * cellW) / 2;
    const oy = (height - rows * cellH) / 2;

    // Draws the grid one row at a time, one string per verse (and one for the
    // water), relying on the monospace advance to keep columns aligned.
    const paint = () => {
      if (stage) ctx.clearRect(0, 0, width, height);
      else {
        ctx.fillStyle = '#faf8f4';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.font = `${fontPx}px ${mono}`;
      ctx.textBaseline = 'top';
      const runs = new Map<number, string[]>();
      for (let y = 0; y < rows; y++) {
        runs.clear();
        const row = grid[y];
        for (let x = 0; x < cols; x++) {
          const ch = row[x];
          if (ch === ' ') continue;
          const o = owner[y][x];
          let arr = runs.get(o);
          if (!arr) {
            arr = new Array<string>(cols).fill(' ');
            runs.set(o, arr);
          }
          arr[x] = ch;
        }
        runs.forEach((arr, o) => {
          const a = o < 0 ? (stage ? 0.55 : 0.85) : 0.85 * (stage ? stage.lit[o] ?? 1 : 1);
          ctx.fillStyle = css(color, a);
          ctx.fillText(arr.join(''), ox, oy + y * cellH);
        });
      }
    };

    const render = (now: number) => {
      if (!stage && !reduced) raf = requestAnimationFrame(render);
      if (!stage && now - last < 33) return; // ~30 fps is plenty for text
      last = now;
      const t = stage ? stage.time() : reduced ? 20 : (now - start) / 1000;

      // The block erodes, then quietly rebuilds: a cycle rather than an ending.
      const erosion = (t * erosionRate) % (maxInner + 6);
      const jitter = rng(fp.seed ^ Math.floor(t * 3));

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (x >= bx && x < bx + bw && y >= by && y < by + bh) {
            const inner = Math.min(x - bx, bx + bw - 1 - x, y - by, by + bh - 1 - y);
            const li = ((y - by) * bw + (x - bx)) % letters.length;
            const ch = letters[li];
            owner[y][x] = letterVerse[li] ?? -1;
            if (inner > erosion) grid[y][x] = ch;
            else if (inner > erosion - 2) grid[y][x] = jitter() > 0.75 ? ch : '·';
            else grid[y][x] = ' ';
          } else {
            owner[y][x] = -1;
            const dx = x - cols / 2;
            const dy = (y - rows / 2) * (cellH / cellW);
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

      paint();
    };

    // Wait for the monospace face, then size it so one glyph = one cell.
    const begin = () => {
      if (cancelled) return;
      ctx.font = `100px ${mono}`;
      const adv = ctx.measureText('MMMMMMMMMM').width / 10 || 60;
      fontPx = Math.min(cellH * 1.05, (100 * cellW) / adv);
      if (stage) {
        render(performance.now());
        teardown = stage.subscribe(24, () => {
          if (stage.visible()) render(performance.now());
        });
      } else {
        raf = requestAnimationFrame(render);
      }
    };
    if (document.fonts?.load) document.fonts.load(`16px ${mono}`).then(begin, begin);
    else begin();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      teardown?.();
    };
  }, [fp, width, height, stage]);

  return <canvas ref={canvasRef} aria-hidden style={{ display: 'block' }} />;
}
