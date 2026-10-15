// ──────────────────────────────────────────────────────────────────────────────────
// Perpetuo — Poem fingerprint
// A compact, numeric portrait of a parsed poem. Generative art pieces read
// only this, never the parser directly, so the analysis can improve
// (local parser → Rantanplan → future models) without touching the art.
// Most values are normalised to 0–1.
// ──────────────────────────────────────────────────────────────────────────────────

import { FieldColor, FIELD_COLORS, ParsedPoem, SemanticField } from './poemParser';

export interface FingerprintVerse {
  text: string;
  syllables: number;
  normalized: number;       // syllables / longest verse
  stress: boolean[];        // one entry per metrical syllable
  field: SemanticField;
  color: FieldColor;
  rhymeGroup: number;       // -1 if the verse does not rhyme
  stanza: number;
  enjambed: boolean;
  anomaly: boolean;         // breaks the dominant meter
}

export interface PoemFingerprint {
  seed: number;                       // stable per poem text: same poem → same art
  source: 'local' | 'rantanplan';
  language: 'es' | 'en' | 'mixed';
  formName: string;

  verseCount: number;
  stanzaCount: number;
  stanzaSizes: number[];

  dominantMeter: number;              // 8, 11, 14…
  meterRegularity: number;            // share of verses within ±1 of the dominant meter
  stressDensity: number;              // share of stressed syllables overall
  anomalies: number;                  // count of verses breaking the meter

  rhymeDensity: number;               // share of verses that rhyme
  rhymeGroups: number;
  rhymeColors: FieldColor[];

  enjambment: number;                 // share of run-on verses
  pauses: number;                     // share of verses with internal pauses
  exclamation: number;
  interrogation: number;
  lexicalDensity: number;

  emotions: Record<SemanticField, number>;  // share of verses per field (sums to 1)
  turbulence: number;                 // furia, miedo, frustración, inseguridad
  stillness: number;                  // resignación, duelo, nostalgia, tristeza
  warmth: number;                     // amor, alegría, optimismo, honor
  stanzaContrast: number[];           // per stanza, vs the previous one
  palette: FieldColor[];              // dominant emotion colours, strongest first

  verses: FingerprintVerse[];
}

const TURBULENT: SemanticField[] = ['furia', 'miedo', 'frustración', 'inseguridad'];
const STILL: SemanticField[] = ['resignación', 'duelo', 'nostalgia', 'tristeza'];
const WARM: SemanticField[] = ['amor', 'alegría', 'optimismo', 'honor'];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function buildFingerprint(poem: ParsedPoem): PoemFingerprint {
  const vs = poem.allVerses;
  const n = Math.max(1, vs.length);
  const share = (pred: (v: (typeof vs)[number]) => boolean) => vs.filter(pred).length / n;

  const emotions = Object.fromEntries(
    (Object.keys(FIELD_COLORS) as SemanticField[]).map(f => [f, 0]),
  ) as Record<SemanticField, number>;
  for (const v of vs) emotions[v.field] += 1 / n;

  const sum = (fields: SemanticField[]) => fields.reduce((s, f) => s + emotions[f], 0);

  const ranked = (Object.entries(emotions) as [SemanticField, number][])
    .filter(([f, w]) => f !== 'neutral' && w > 0)
    .sort((a, b) => b[1] - a[1]);
  const palette = ranked.length
    ? ranked.slice(0, 5).map(([f]) => FIELD_COLORS[f])
    : [FIELD_COLORS.neutral];

  const verses: FingerprintVerse[] = vs.map(v => ({
    text: v.text,
    syllables: v.syllables,
    normalized: v.normalizedSyllables,
    stress: Array.from(v.stress, c => c === '+'),
    field: v.field,
    color: v.fieldColor,
    rhymeGroup: v.rhymeGroupIndex,
    stanza: v.stanzaIndex,
    enjambed: v.isEnjambment,
    anomaly: v.isMetricalAnomaly,
  }));

  const totalSyl = verses.reduce((s, v) => s + v.stress.length, 0);
  const totalStress = verses.reduce((s, v) => s + v.stress.filter(Boolean).length, 0);

  return {
    seed: hashString(vs.map(v => v.text).join('\n')),
    source: poem.meterSource,
    language: poem.language,
    formName: poem.form.name,

    verseCount: vs.length,
    stanzaCount: poem.stanzas.length,
    stanzaSizes: poem.stanzas.map(s => s.verses.length),

    dominantMeter: poem.form.dominantMeter,
    meterRegularity: poem.form.regularPercent / 100,
    stressDensity: totalSyl ? totalStress / totalSyl : 0,
    anomalies: vs.filter(v => v.isMetricalAnomaly).length,

    rhymeDensity: share(v => v.rhymeGroupIndex >= 0),
    rhymeGroups: poem.rhymeGroups.length,
    rhymeColors: poem.rhymeGroups.map(g => g.color),

    enjambment: share(v => v.isEnjambment),
    pauses: share(v => v.hasInternalPause),
    exclamation: share(v => v.isExclamatory),
    interrogation: share(v => v.isInterrogative),
    lexicalDensity: vs.reduce((s, v) => s + v.density, 0) / n,

    emotions,
    turbulence: sum(TURBULENT),
    stillness: sum(STILL),
    warmth: sum(WARM),
    stanzaContrast: poem.stanzas.map(s => s.contrastWithPrev),
    palette,

    verses,
  };
}

// ─── Helpers shared by the art pieces ─────────────────────────────────────────────

// Deterministic PRNG (mulberry32) so a poem always yields the same artwork.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mix(a: FieldColor, b: FieldColor, t: number): FieldColor {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export function css(c: FieldColor, alpha = 1): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

export const INK: FieldColor = { r: 42, g: 39, b: 35 };
export const PAPER: FieldColor = { r: 250, g: 248, b: 244 };
