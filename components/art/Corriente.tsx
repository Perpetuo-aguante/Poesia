'use client';

import { useRef } from 'react';
import { INK, PAPER, css, mix, rng } from '@/lib/fingerprint';
import { FieldColor } from '@/lib/poemParser';
import { ArtProps } from './types';
import { useCanvasLoop } from './useCanvasLoop';

// A flow field where every rhyme is a whirlpool. Particles carry the colour
// of the verse they belong to and leave trails as long as the poem is still.

export default function Corriente({ fingerprint: fp, width, height, stage }: ArtProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Stage presentation: themed ink, re-toned colours, per-verse light.
  const ink = stage?.theme.ink ?? INK;
  const tone = stage?.theme.tone ?? ((c: FieldColor) => c);

  useCanvasLoop(ref, width, height, (ctx, w, h) => {
    const random = rng(fp.seed);
    const count = Math.min(1800, 500 + fp.verseCount * 50);
    const speed = 0.6 + fp.turbulence * 1.8 + fp.exclamation;
    // Trails are redrawn from scratch each frame (alpha-fading leaves a grey residue).
    const trailLength = Math.round(28 + fp.stillness * 60);
    const freq = 0.002 + fp.dominantMeter * 0.0004;
    const wrap = fp.enjambment > 0.5;
    const phase = [random() * 6.28, random() * 6.28, random() * 6.28];

    const sizes = new Map<number, number>();
    fp.verses.forEach(v => v.rhymeGroup >= 0 && sizes.set(v.rhymeGroup, (sizes.get(v.rhymeGroup) ?? 0) + 1));
    const vortices = Array.from(sizes, ([g, size]) => ({
      x: w * (0.15 + random() * 0.7),
      y: h * (0.15 + random() * 0.7),
      strength: (g % 2 ? -1 : 1) * (0.6 + size * 0.25),
      radius: Math.min(w, h) * (0.12 + size * 0.03),
    }));

    const particles = Array.from({ length: count }, (_, i) => ({
      x: random() * w,
      y: random() * h,
      life: Math.floor(random() * 240),
      trail: [] as number[],
      verse: i % Math.max(1, fp.verseCount),
      color: css(mix(ink, tone(fp.verses[i % Math.max(1, fp.verseCount)]?.color ?? fp.palette[0]), 0.75), 0.5),
    }));

    return (c, t, _w, _h, _f, rate = 1) => {
      if (stage) c.clearRect(0, 0, w, h);
      else {
        c.fillStyle = css(PAPER);
        c.fillRect(0, 0, w, h);
      }
      c.lineWidth = 1.2;
      c.lineCap = 'round';

      for (const p of particles) {
        if (stage) c.globalAlpha = stage.lit[p.verse] ?? 1;
        // A frozen clock (Still motion) keeps the trails exactly where they are.
        if (rate > 0) {
        let a =
          Math.sin(p.x * freq + phase[0] + t * 0.05) * 2 +
          Math.cos(p.y * freq * 1.3 + phase[1]) * 2 +
          Math.sin((p.x + p.y) * freq * 0.5 + phase[2] - t * 0.03);
        let vx = Math.cos(a);
        let vy = Math.sin(a);
        for (const v of vortices) {
          const dx = p.x - v.x;
          const dy = p.y - v.y;
          const d2 = dx * dx + dy * dy;
          const pull = v.strength * Math.exp(-d2 / (v.radius * v.radius));
          vx += (-dy / Math.sqrt(d2 + 1)) * pull * 2 - (dx / Math.sqrt(d2 + 1)) * Math.abs(pull) * 0.3;
          vy += (dx / Math.sqrt(d2 + 1)) * pull * 2 - (dy / Math.sqrt(d2 + 1)) * Math.abs(pull) * 0.3;
        }
        a = Math.atan2(vy, vx);
        const nx = p.x + Math.cos(a) * speed * rate;
        const ny = p.y + Math.sin(a) * speed * rate;

        p.x = nx;
        p.y = ny;
        p.life--;
        const out = p.x < 0 || p.x > w || p.y < 0 || p.y > h;
        if (out && wrap) {
          p.x = (p.x + w) % w;
          p.y = (p.y + h) % h;
          p.trail.length = 0;
        } else if (out || p.life <= 0) {
          p.x = random() * w;
          p.y = random() * h;
          p.life = 80 + Math.floor(random() * 200);
          p.trail.length = 0;
        }
        p.trail.push(p.x, p.y);
        if (p.trail.length > trailLength * 2) p.trail.splice(0, 2);
        }

        if (p.trail.length >= 4) {
          c.strokeStyle = p.color;
          c.beginPath();
          c.moveTo(p.trail[0], p.trail[1]);
          for (let k = 2; k < p.trail.length; k += 2) c.lineTo(p.trail[k], p.trail[k + 1]);
          c.stroke();
        }
      }
      c.globalAlpha = 1;
    };
  }, [fp], 300, stage, 60);

  return <canvas ref={ref} aria-hidden />;
}
