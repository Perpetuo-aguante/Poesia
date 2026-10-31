'use client';

import { useRef } from 'react';
import { INK, PAPER, css, mix, rng } from '@/lib/fingerprint';
import { FieldColor } from '@/lib/poemParser';
import { ArtProps } from './types';
import { useCanvasLoop } from './useCanvasLoop';

// Each verse becomes a mountain ridge whose peaks are its stressed syllables.
// Read top to bottom, the poem is a range seen from far away.

export default function Cordillera({ fingerprint: fp, width, height, stage }: ArtProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Stage presentation: themed ink, re-toned colours, per-verse light.
  const ink = stage?.theme.ink ?? INK;
  const tone = stage?.theme.tone ?? ((c: FieldColor) => c);

  useCanvasLoop(ref, width, height, (_ctx, w, h) => {
    const n = Math.max(1, fp.verseCount);
    const gaps = Math.max(0, fp.stanzaCount - 1);
    const top = h * 0.22;
    const bottom = h * 0.92;
    const step = (bottom - top) / (n + gaps * 0.8);
    const samples = Math.max(80, Math.floor(w / 4));
    const span = w * 0.62;
    const sharp = 0.55 - fp.turbulence * 0.3 + fp.stillness * 0.2;
    const amp = step * (1.8 + fp.turbulence * 2.2 + fp.exclamation * 1.5);
    const breath = 0.25 + fp.dominantMeter / 30;

    let stanzaOffset = 0;
    const ridges = fp.verses.map((v, i) => {
      if (i > 0 && v.stanza !== fp.verses[i - 1].stanza) stanzaOffset += 0.8;
      const random = rng(fp.seed + i * 7919);
      return {
        v,
        y: top + (i + stanzaOffset) * step,
        phases: [random() * 6.28, random() * 6.28, random() * 6.28],
        stroke: mix(ink, tone(v.color), 0.55),
      };
    });

    return (ctx, t) => {
      if (stage) ctx.clearRect(0, 0, w, h);
      else {
        ctx.fillStyle = css(PAPER);
        ctx.fillRect(0, 0, w, h);
      }

      ridges.forEach(({ v, y, phases, stroke }, i) => {
        const syl = Math.max(1, v.stress.length);
        const width = span * Math.max(0.25, v.normalized);
        const x0 = (w - width) / 2;
        const sylW = width / syl;
        const sigma = sylW * Math.max(0.2, sharp);
        const lift = 1 + 0.12 * Math.sin(t * breath + i * 0.9);

        const pts: number[] = [];
        for (let k = 0; k <= samples; k++) {
          const x = (k / samples) * w;
          let hgt = 0;
          for (let s = 0; s < syl; s++) {
            const d = x - (x0 + (s + 0.5) * sylW);
            hgt += (v.stress[s] ? 1 : 0.14) * Math.exp(-(d * d) / (2 * sigma * sigma));
          }
          // Gentle terrain noise that drifts with time
          const noise =
            Math.sin(x * 0.021 + phases[0] + t * 0.15) * 0.05 +
            Math.sin(x * 0.047 + phases[1] - t * 0.1) * 0.03 +
            Math.sin(x * 0.11 + phases[2]) * 0.015;
          const env = Math.exp(-(((x - w / 2) / (w * 0.45)) ** 4));
          pts.push(x, y - (hgt * amp * lift + noise * step * 3) * env);
        }
        const trace = () => {
          ctx.moveTo(pts[0], pts[1]);
          for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        };

        // Fill below the ridge so nearer ridges hide farther ones
        ctx.beginPath();
        trace();
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        // On the stage the layer is transparent: erase instead of painting paper.
        if (stage) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.fillStyle = css(PAPER);
          ctx.fill();
        }

        ctx.beginPath();
        trace();
        ctx.strokeStyle = css(stroke, 0.9 * (stage ? stage.lit[i] ?? 1 : 1));
        ctx.lineWidth = v.anomaly ? 2 : 1.1;
        ctx.stroke();
      });
    };
  }, [fp], 1, stage, 30);

  return <canvas ref={ref} aria-hidden />;
}
