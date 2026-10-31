'use client';

import { useRef } from 'react';
import { INK, PAPER, css } from '@/lib/fingerprint';
import { FieldColor } from '@/lib/poemParser';
import { ArtProps } from './types';
import { useCanvasLoop } from './useCanvasLoop';

// The poem as a rose window: every verse is a spoke, every syllable a bead,
// and rhymes are threads stretched across the centre.

export default function MandalaRimas({ fingerprint: fp, width, height, stage }: ArtProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Stage presentation: themed ink, re-toned colours, per-verse light.
  const ink = stage?.theme.ink ?? INK;
  const tone = stage?.theme.tone ?? ((c: FieldColor) => c);
  const lit = (i: number) => (stage ? stage.lit[i] ?? 1 : 1);

  useCanvasLoop(ref, width, height, (_ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.45 * (stage ? 1.22 : 1); // bleed past the edges on the stage
    const n = Math.max(1, fp.verseCount);
    const r0 = R * 0.2;
    const spin = 0.015 + fp.turbulence * 0.06;
    const beat = 1.5 + fp.dominantMeter / 6; // syllables per second

    const groups = new Map<number, number[]>();
    fp.verses.forEach((v, i) => {
      if (v.rhymeGroup >= 0) groups.set(v.rhymeGroup, [...(groups.get(v.rhymeGroup) ?? []), i]);
    });

    return (ctx, t) => {
      if (stage) ctx.clearRect(0, 0, w, h);
      else {
        ctx.fillStyle = css(PAPER);
        ctx.fillRect(0, 0, w, h);
      }
      const rot = -Math.PI / 2 + t * spin;
      const angleOf = (i: number) => rot + (i / n) * Math.PI * 2;
      const tip = (i: number) => {
        const a = angleOf(i);
        const r = r0 + (R - r0) * fp.verses[i].normalized;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
      };

      // Stanza arcs
      let start = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = css(ink, 0.22);
      for (const size of fp.stanzaSizes) {
        const a0 = angleOf(start) - 0.3 / n;
        const a1 = angleOf(start + size - 1) + 0.3 / n;
        ctx.beginPath();
        ctx.arc(cx, cy, r0 * 0.7, a0, a1);
        ctx.stroke();
        start += size;
      }

      // Rhyme threads
      for (const [g, idx] of Array.from(groups)) {
        const color = tone(fp.rhymeColors[g] ?? INK);
        ctx.lineWidth = 1.2;
        for (let k = 0; k < idx.length - 1; k++) {
          ctx.strokeStyle = css(color, (0.35 + 0.2 * Math.sin(t * 0.8 + g)) * Math.max(lit(idx[k]), lit(idx[k + 1])));
          const [x1, y1] = tip(idx[k]);
          const [x2, y2] = tip(idx[k + 1]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(cx + (x1 + x2 - 2 * cx) * 0.15, cy + (y1 + y2 - 2 * cy) * 0.15, x2, y2);
          ctx.stroke();
        }
      }

      // Spokes and syllable beads
      fp.verses.forEach((v, i) => {
        const a = angleOf(i);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const len = (R - r0) * v.normalized;
        const syl = Math.max(1, v.stress.length);

        const L = lit(i);
        const vc = tone(v.color);
        ctx.strokeStyle = css(ink, (v.anomaly ? 0.35 : 0.12) * L);
        ctx.setLineDash(v.enjambed ? [2, 3] : []);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + cos * r0, cy + sin * r0);
        ctx.lineTo(cx + cos * (r0 + len), cy + sin * (r0 + len));
        ctx.stroke();
        ctx.setLineDash([]);

        const pulse = (t * beat + i * 0.7) % (syl + 3);
        for (let s = 0; s < syl; s++) {
          const r = r0 + (len * (s + 0.5)) / syl;
          const glow = Math.max(0, 1 - Math.abs(pulse - s));
          const stressed = v.stress[s];
          ctx.fillStyle = stressed ? css(vc, (0.8 + glow * 0.2) * L) : css(ink, (0.3 + glow * 0.4) * L);
          ctx.beginPath();
          ctx.arc(cx + cos * r, cy + sin * r, (stressed ? 3.4 : 1.4) + glow * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Core
      ctx.fillStyle = css(tone(fp.palette[0]), 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, r0 * 0.45 * (1 + 0.06 * Math.sin(t * 0.9)), 0, Math.PI * 2);
      ctx.fill();
    };
  }, [fp], 1, stage, 60);

  return <canvas ref={ref} aria-hidden />;
}
