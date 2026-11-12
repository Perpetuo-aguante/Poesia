// ──────────────────────────────────────────────────────────────────────────────────
// Perpetuo — Poem fingerprint
// A compact, numeric portrait of a parsed poem. Generative art pieces read
// only this, never the parser directly, so the analysis can improve
// (local parser → Rantanplan → future models) without touching the art.
// Most values are normalised to 0–1.
// ──────────────────────────────────────────────────────────────────────────────────

import { EmotionFamily, FieldColor, FIELD_COLORS, ParsedPoem, SemanticField } from './poemParser';
import { EMOTIONS } from './emotions';

export interface FingerprintVerse {
  text: string;
  syllables: number;
  normalized: number;       // syllables / longest verse
  stress: boolean[];        // one entry per metrical syllable
  field: SemanticField;
  color: FieldColor;
  valence: number;          // -1 … 1
  arousal: number;          // 0 … 1
  intensity: number;        // 0–1, the verse's own emotional charge
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

  emotions: Record<SemanticField, number>;  // emotional mix of the poem over 40 emotions (sums to 1)
  families: Record<EmotionFamily, number>;  // the same mix over the 9 families
  valence: number;                    // -1 (painful) … 1 (pleasant)
  arousal: number;                    // 0 (still) … 1 (agitated)
  turbulence: number;                 // agitated, painful emotions (furia, miedo, angustia…)
  stillness: number;                  // quiet, low emotions (melancolía, duelo, hastío, resignación…)
  warmth: number;                     // pleasant emotions (amor, alegría, ternura, esperanza…)
  stanzaContrast: number[];           // per stanza, vs the previous one
  palette: FieldColor[];              // dominant emotion colours, strongest first

  verses: FingerprintVerse[];
}

// Each emotion's contribution to the three broad moods the art pieces read,
// derived from its valence and arousal in lib/emotions/taxonomy.json.
const MOOD = Object.fromEntries(EMOTIONS.map(e => [e.id, {
  turbulence: e.arousal * (e.valence < 0 ? 1 : 0.4),
  stillness: (1 - e.arousal) * (e.valence <= 0.1 ? 1 : 0.5),
  warmth: Math.max(0, e.valence),
}])) as Record<string, { turbulence: number; stillness: number; warmth: number }>;

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

  const emotions = { ...poem.emotion.distribution };
  const mood = (k: 'turbulence' | 'stillness' | 'warmth') =>
    Math.min(1, Object.entries(emotions).reduce((s, [f, w]) => s + w * (MOOD[f]?.[k] ?? 0), 0) / 0.75);

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
    valence: v.emotion.valence,
    arousal: v.emotion.arousal,
    intensity: v.emotion.intensity,
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
    families: { ...poem.emotion.families },
    valence: poem.emotion.valence,
    arousal: poem.emotion.arousal,
    turbulence: mood('turbulence'),
    stillness: mood('stillness'),
    warmth: mood('warmth'),
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
