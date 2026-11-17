'use client';

import { useMemo } from 'react';
import type { ParsedPoem, ParsedVerse, SemanticField } from '@/lib/poemParser';
import { EMOTION_IDS } from '@/lib/poemParser';
import { emoSlug } from '../tokens';

const emoColor = (f: string) => (f === 'neutral' ? 'var(--color-ink-2)' : `var(--emo-${emoSlug(f)})`);
const pct = (x: number) => `${Math.round(x * 100)} %`;

function valenceWord(v: number) {
  if (v > 0.35) return 'luminoso';
  if (v > 0.1) return 'templado hacia la luz';
  if (v >= -0.1) return 'ambivalente';
  if (v >= -0.35) return 'templado hacia la sombra';
  return 'sombrío';
}

function arousalWord(a: number) {
  if (a > 0.65) return 'agitado';
  if (a > 0.45) return 'tenso';
  if (a > 0.3) return 'contenido';
  return 'quieto';
}

// The second strongest emotion of a verse, when it is a real presence (≥ 15 %).
export function secondEmotion(v: ParsedVerse): SemanticField | null {
  let best = -1, second = -1;
  v.emotion.vector.forEach((w, i) => {
    if (best < 0 || w > v.emotion.vector[best]) { second = best; best = i; }
    else if (second < 0 || w > v.emotion.vector[second]) second = i;
  });
  return second >= 0 && v.emotion.vector[second] >= 0.15 ? EMOTION_IDS[second] : null;
}

export function verseWords(v: ParsedVerse): string {
  return v.emotion.hits
    .map(h => `${h.negated ? 'no ' : ''}${h.token} → ${h.emotions.map(e => e.id).join(', ')}`)
    .join('\n');
}

// Arc of valence (line) and arousal (dots) across the poem's verses.
function Arc({ poem }: { poem: ParsedPoem }) {
  const pts = poem.emotion.arc;
  const W = 600, H = 90, pad = 6;
  if (pts.length < 2) return null;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  // Scale to the poem's own range (valence rarely leaves ±0.5), but never
  // exaggerate a nearly flat poem.
  const span = Math.max(0.35, ...pts.map(p => Math.abs(p.valence)));
  const y = (v: number) => H / 2 - (v / span) * (H / 2 - pad - 4);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valence).toFixed(1)}`).join(' ');
  return (
    <svg className="emo-arc" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
      aria-label="Arco emocional: valencia de cada verso, de la sombra (abajo) a la luz (arriba)">
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="emo-arc-axis" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.valence)} r={1.5 + p.arousal * 3.5}
          style={{ fill: emoColor(poem.allVerses[i]?.field ?? 'neutral') }} />
      ))}
      <path d={line} className="emo-arc-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function EmotionMap({ poem }: { poem: ParsedPoem }) {
  const ranked = useMemo(
    () => (Object.entries(poem.emotion.distribution) as [SemanticField, number][])
      .filter(([f, w]) => f !== 'neutral' && w > 0)
      .sort((a, b) => b[1] - a[1]),
    [poem.emotion.distribution],
  );
  const families = useMemo(
    () => Object.entries(poem.emotion.families).filter(([f, w]) => f !== 'neutral' && w > 0).sort((a, b) => b[1] - a[1]),
    [poem.emotion.families],
  );
  if (!ranked.length) return null;

  // Bar: the leading emotions; the long tail is grouped as "otras".
  const lead = ranked.filter(([, w]) => w >= 0.04).slice(0, 8);
  const rest = 1 - lead.reduce((s, [, w]) => s + w, 0);

  return (
    <section className="emo-map" aria-label="Mapa emocional">
      <h3 className="emo-map-title">Mapa emocional</h3>

      <div className="emo-bar" role="img" aria-label={lead.map(([f, w]) => `${f} ${pct(w)}`).join(', ')}>
        {lead.map(([f, w]) => (
          <span key={f} style={{ flexGrow: w, background: emoColor(f) }} title={`${f} · ${pct(w)}`} />
        ))}
        {rest > 0.01 && <span className="emo-bar-rest" style={{ flexGrow: rest }} title={`otras · ${pct(rest)}`} />}
      </div>

      <ul className="emo-legend">
        {lead.map(([f, w]) => (
          <li key={f}>
            <span className="emo-dot" style={{ background: emoColor(f) }} aria-hidden /> {f} <span className="mono">{pct(w)}</span>
          </li>
        ))}
        {rest > 0.01 && <li className="muted">otras {ranked.length - lead.length} · <span className="mono">{pct(rest)}</span></li>}
      </ul>

      <dl className="reading-stats emo-stats">
        <div>
          <dt>Familia dominante</dt>
          <dd>{families[0]?.[0]} <span className="mono muted">{pct(families[0]?.[1] ?? 0)}</span></dd>
        </div>
        <div>
          <dt>Valencia</dt>
          <dd>{valenceWord(poem.emotion.valence)} <span className="mono muted">{poem.emotion.valence.toFixed(2)}</span></dd>
        </div>
        <div>
          <dt>Activación</dt>
          <dd>{arousalWord(poem.emotion.arousal)} <span className="mono muted">{poem.emotion.arousal.toFixed(2)}</span></dd>
        </div>
        <div>
          <dt>Emociones presentes</dt>
          <dd>{ranked.filter(([, w]) => w >= 0.02).length} de 40</dd>
        </div>
      </dl>

      <figure className="emo-arc-fig">
        <Arc poem={poem} />
        <figcaption>
          Arco por verso: arriba la luz, abajo la sombra; el tamaño del punto es la agitación, su color la emoción del verso.
        </figcaption>
      </figure>
    </section>
  );
}
