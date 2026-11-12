import { getEmotionEngine, EMOTIONS, FAMILIES, LexHit } from './emotions';

// ──────────────────────────────────────────────────────────────────────────────────
// Perpetuo — Poem Parser
// Converts raw poem text into a structured object with metric, rhythmic,
// and semantic/emotional properties that drive the canvas visualiser.
//
// Spanish metric rules implemented:
//   • Sinalefa (synalepha): vowel at end of word + vowel at start of next = −1 syl
//   • Diptongo / hiato / triptongo within words
//   • Coda-stress adjustment: aguda +1, llana ±0, esdrújula −1
//
// Emotion system: 40 emotions in 9 families (lib/emotions/taxonomy.json),
//   scored by lib/emotions/engine.ts with lexicons built from a 5,000-poem
//   Spanish corpus and a 450-poem English corpus (see emotion-lab/).
//   Every verse carries a full emotion vector plus valence and arousal;
//   `field` is its strongest emotion ('neutral' only when nothing in the
//   verse or its surroundings carries emotion).
//
// Syntagma coloring: each verse is split into rhythmic groups (syntagmas)
//   separated by internal punctuation; each syntagma is colored by its
//   dominant emotion. Rhyming verse-endings share the same color across verses.
// ──────────────────────────────────────────────────────────────────────────────────

export type SemanticField =
  | 'alegría'
  | 'júbilo'
  | 'gozo'
  | 'serenidad'
  | 'gratitud'
  | 'amor'
  | 'deseo'
  | 'ternura'
  | 'devoción'
  | 'celos'
  | 'optimismo'
  | 'esperanza'
  | 'anhelo'
  | 'asombro'
  | 'misterio'
  | 'éxtasis'
  | 'tristeza'
  | 'melancolía'
  | 'soledad'
  | 'nostalgia'
  | 'duelo'
  | 'desolación'
  | 'miedo'
  | 'angustia'
  | 'inseguridad'
  | 'desamparo'
  | 'furia'
  | 'frustración'
  | 'rencor'
  | 'indignación'
  | 'desprecio'
  | 'asco'
  | 'hastío'
  | 'desengaño'
  | 'deber'
  | 'honor'
  | 'orgullo'
  | 'culpa'
  | 'vergüenza'
  | 'resignación'
  | 'neutral';

export type EmotionFamily =
  | 'alegría'
  | 'amor'
  | 'esperanza'
  | 'asombro'
  | 'tristeza'
  | 'miedo'
  | 'ira'
  | 'rechazo'
  | 'conciencia'
  | 'neutral';

export interface FieldColor {
  r: number;
  g: number;
  b: number;
}

export interface PoemForm {
  name: string;           // 'Soneto', 'Romance', 'Silva', 'Verso libre', …
  dominantMeter: number;  // most common syllable count, e.g. 11
  meterName: string;      // 'endecasílabo', 'octosílabo', …
  regularPercent: number; // 0–100 — % of verses within ±1 of dominantMeter
  isRegular: boolean;     // regularPercent >= 75
}

// A syntagma is a rhythmic/syntactic group within a verse, separated by
// commas, semicolons, em-dashes, or colons. Each gets its own emotion color.
export interface ParsedSyntagma {
  text: string;
  syllables: number;
  field: SemanticField;
  fieldColor: FieldColor;
  rhymeColor?: FieldColor;  // set on the last syntagma if verse participates in a rhyme group
}

// A rhyme group: verses whose last words share the same terminal sound.
export interface RhymeGroup {
  signature: string;                   // the matching sound (e.g. 'or', 'ao')
  type: 'consonante' | 'asonante';
  verseIndices: number[];              // globalVerseIndex of each verse
  color: FieldColor;
  groupIndex: number;
}

export interface ParsedVerse {
  text: string;
  syllables: number;
  normalizedSyllables: number;    // 0–1 relative to poem max
  field: SemanticField;           // dominant emotion of the whole verse
  fieldColor: FieldColor;
  density: number;                // 0–1 content-word ratio
  isExclamatory: boolean;
  isInterrogative: boolean;
  isEnjambment: boolean;          // no terminal punctuation
  hasInternalPause: boolean;      // comma / semicolon / em-dash
  isMetricalAnomaly: boolean;     // deviates >2 syl from dominant meter
  speed: number;                  // animation speed multiplier
  phase: number;                  // per-column phase offset (radians)
  stanzaIndex: number;
  verseIndex: number;             // global (across all stanzas)
  syntagmas: ParsedSyntagma[];    // rhythmic sub-groups within this verse
  rhymeGroupIndex: number;        // index into poem.rhymeGroups, or -1
  emotion: VerseEmotionInfo;      // full emotional reading of the verse
  stress: string;                 // stress pattern, one char per metrical syllable: '+' stressed, '-' unstressed
}

// Emotional reading of a verse. `vector` is indexed like EMOTION_IDS and sums
// to 1 (all zeros when neutral); it already includes context from the
// neighbouring verses, the stanza and the poem.
export interface VerseEmotionInfo {
  vector: number[];
  family: EmotionFamily;
  confidence: number;   // 0–1: share of the top emotion
  intensity: number;    // 0–1: emotional charge of the verse's own words
  valence: number;      // -1 (painful) … 1 (pleasant)
  arousal: number;      // 0 (still) … 1 (agitated)
  hits: LexHit[];       // the words that carried emotion
}

export interface PoemEmotionInfo {
  distribution: Record<SemanticField, number>;  // sums to 1 over the 40 emotions
  families: Record<EmotionFamily, number>;      // sums to 1 over the 9 families
  valence: number;
  arousal: number;
  arc: { valence: number; arousal: number }[];  // per verse, for timelines
}

export interface ParsedStanza {
  verses: ParsedVerse[];
  index: number;
  dominantField: SemanticField;
  emotionVector: number[];        // mean of its verses' vectors
  avgDensity: number;
  contrastWithPrev: number;       // 0–1 semantic contrast vs prev stanza
}

export interface ParsedPoem {
  stanzas: ParsedStanza[];
  allVerses: ParsedVerse[];
  maxSyllables: number;
  minSyllables: number;
  avgSyllables: number;
  dominantField: SemanticField;
  language: 'es' | 'en' | 'mixed';
  form: PoemForm;
  rhymeGroups: RhymeGroup[];
  emotion: PoemEmotionInfo;
  meterSource: 'local' | 'rantanplan';  // who scanned the meter and stress
}

// ─── Field colors — base palette (Bloques mode) ────────────────────────────────────

const FIELD_COLORS = Object.fromEntries([
  ...EMOTIONS.map(e => [e.id, { r: e.color[0], g: e.color[1], b: e.color[2] }]),
  ['neutral', { r: 155, g: 150, b: 140 }], // warm grey
]) as Record<SemanticField, FieldColor>;

const FAMILY_COLORS = Object.fromEntries([
  ...FAMILIES.map(f => [f.id, { r: f.color[0], g: f.color[1], b: f.color[2] }]),
  ['neutral', { r: 155, g: 150, b: 140 }],
]) as Record<EmotionFamily, FieldColor>;

// The 13 emotions of the first version (plus neutral). Older views keyed by
// them map each newer emotion to an original one of the same family.
export type LegacyField =
  | 'nostalgia' | 'inseguridad' | 'miedo' | 'deber' | 'amor' | 'honor' | 'duelo'
  | 'tristeza' | 'resignación' | 'furia' | 'frustración' | 'optimismo' | 'alegría' | 'neutral';
const LEGACY = new Set<string>(['nostalgia', 'inseguridad', 'miedo', 'deber', 'amor', 'honor', 'duelo',
  'tristeza', 'resignación', 'furia', 'frustración', 'optimismo', 'alegría', 'neutral']);
const LEGACY_BY_FAMILY: Record<string, LegacyField> = {
  alegría: 'alegría', amor: 'amor', esperanza: 'optimismo', asombro: 'optimismo', tristeza: 'tristeza',
  miedo: 'miedo', ira: 'furia', rechazo: 'frustración', conciencia: 'deber',
};
export function legacyField(field: SemanticField): LegacyField {
  if (LEGACY.has(field)) return field as LegacyField;
  return LEGACY_BY_FAMILY[EMOTION_FAMILY[field]] ?? 'neutral';
}

export const EMOTION_IDS = EMOTIONS.map(e => e.id) as Exclude<SemanticField, 'neutral'>[];
export const EMOTION_FAMILY = Object.fromEntries([
  ...EMOTIONS.map(e => [e.id, e.family]),
  ['neutral', 'neutral'],
]) as Record<SemanticField, EmotionFamily>;

// ─── Rhyme group color palette ──────────────────────────────────────────────────────────────

export const RHYME_COLORS: FieldColor[] = [
  { r: 245, g:  80, b:  80 }, // coral red
  { r:   0, g: 185, b: 195 }, // teal cyan
  { r: 230, g: 170, b:   0 }, // gold
  { r: 140, g:  55, b: 255 }, // violet
  { r:  30, g: 190, b:  90 }, // emerald
  { r: 255, g: 120, b:  25 }, // amber orange
  { r:  85, g: 125, b: 255 }, // periwinkle
  { r: 255, g:  60, b: 185 }, // magenta
];

// ─── Language detection ──────────────────────────────────────────────────────────────────────────────────

function detectLanguage(text: string): 'es' | 'en' | 'mixed' {
  const esMarkers = /\b(el|la|los|las|un|una|de|del|que|en|es|y|a|por|con|no|se|me|te|lo|le|su|al|más|pero|como|hay|todo|ser|estar|era|fue|son|han|sus|este|esta|eso|esa|muy|también|donde|cuando|sin|sobre)\b/gi;
  const enMarkers = /\b(the|a|an|of|in|is|it|that|and|for|on|with|he|she|they|are|was|were|have|had|this|but|not|from|by|be|at|to|do|did|has|his|her|its|we|you|your|all|also|just|or|if|as|so)\b/gi;
  const esCount = (text.match(esMarkers) || []).length;
  const enCount = (text.match(enMarkers) || []).length;
  if (esCount > enCount * 1.4) return 'es';
  if (enCount > esCount * 1.4) return 'en';
  return 'mixed';
}

// ─── Spanish syllable counting ─────────────────────────────────────────────────────────────

const STRONG = new Set<string>(['a','e','o','á','é','ó']);
const WEAK   = new Set<string>(['i','u','ü']);
const WEAK_A = new Set<string>(['í','ú']);
const ALL_V  = new Set<string>(['a','e','o','á','é','ó','i','u','ü','í','ú']);

function isVowel(c: string): boolean { return ALL_V.has(c); }
function isWeakUnaccented(c: string): boolean { return WEAK.has(c); }

function isHiato(v1: string, v2: string): boolean {
  if (STRONG.has(v1) && STRONG.has(v2)) return true;
  if (WEAK_A.has(v1) || WEAK_A.has(v2)) return true;
  return false;
}

function syllablesInWord(raw: string): number {
  let w = raw.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return 0;
  if (/y$/.test(w)) w = w.slice(0, -1) + 'i';

  let count = 0;
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    if (!isVowel(c)) { i++; continue; }
    count++;
    const v1 = c;
    const v2 = w[i + 1];
    const v3 = w[i + 2];
    if (v2 && isVowel(v2)) {
      if (!isHiato(v1, v2)) {
        if (isWeakUnaccented(v1) && STRONG.has(v2) && v3 && isWeakUnaccented(v3)) {
          i += 2;
        } else {
          i++;
        }
      }
    }
    i++;
  }
  return Math.max(1, count);
}

type StressType = 'aguda' | 'llana' | 'esdrujula';

function stressType(raw: string): StressType {
  const w = raw.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return 'llana';
  const sylCount = syllablesInWord(raw);
  if (sylCount <= 1) return 'llana';
  const accentMatch = w.match(/[áéíóú]/);
  if (accentMatch) {
    let accentPos = -1;
    for (let i = 0; i < w.length; i++) {
      if ('áéíóú'.includes(w[i])) { accentPos = i; break; }
    }
    let nucleiAfter = 0;
    let i = accentPos + 1;
    while (i < w.length) {
      if (isVowel(w[i])) {
        nucleiAfter++;
        if (i + 1 < w.length && isVowel(w[i + 1]) && !isHiato(w[i], w[i + 1])) {
          i++;
        }
      }
      i++;
    }
    if (nucleiAfter === 0) return 'aguda';
    if (nucleiAfter === 1) return 'llana';
    return 'esdrujula';
  }
  const last = w[w.length - 1];
  if (isVowel(last) || last === 'n' || last === 's') return 'llana';
  return 'aguda';
}

function endsInVowelSound(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return false;
  const last = w[w.length - 1];
  if (last === 'y') return true;
  if (isVowel(last)) return true;
  if (last === 'h' && w.length > 1) return isVowel(w[w.length - 2]);
  return false;
}

function startsWithVowelSound(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return false;
  const first = w[0];
  if (first === 'h') return w.length > 1 && isVowel(w[1]);
  if (first === 'y') return w.length > 1 && isVowel(w[1]) ? false : isVowel(first);
  return isVowel(first);
}

function verseSyllables(line: string, lang: 'es' | 'en' | 'mixed'): number {
  const rawTokens = line.trim().split(/\s+/).filter(Boolean);
  if (!rawTokens.length) return 0;
  if (lang === 'en') {
    return Math.max(1, rawTokens.reduce((s, w) => s + syllablesEnglish(w), 0));
  }
  const tokens: { word: string; pauseAfter: boolean }[] = rawTokens.map(t => ({
    word: t.replace(/[¿¡?!.,;:—–""“”''«»()\[\]]/g, ''),
    pauseAfter: /[,;:—–]/.test(t),
  }));
  const words = tokens.map(t => t.word).filter(Boolean);
  if (!words.length) return 0;
  let total = words.reduce((s, w) => s + syllablesInWord(w), 0);
  for (let i = 0; i < words.length - 1; i++) {
    if (tokens[i].pauseAfter) continue;
    if (endsInVowelSound(words[i]) && startsWithVowelSound(words[i + 1])) {
      total--;
    }
  }
  const lastWord = words[words.length - 1];
  const stress = stressType(lastWord);
  if (stress === 'aguda')    total++;
  if (stress === 'esdrujula') total--;
  return Math.max(1, total);
}

function syllablesEnglish(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

// ─── Semantic / emotion analysis ──────────────────────────────────────────────────────────────────────

const FUNCTION_WORDS = new Set([
  'el','la','los','las','un','una','de','del','que','en','es','y','a',
  'por','con','no','se','me','te','lo','le','su','al','más','pero','como',
  'hay','ser','estar','si','ya','ni','o','u','e','sino','aunque','sobre',
  'entre','hacia','desde','hasta','para','porque','cuando','donde','cuanto',
  'ante','bajo','cabe','tras','según','durante','mediante','via','vs',
  'este','esta','estos','estas','ese','esa','esos','esas','aquel','aquella',
  'mi','tu','él','ella','ellos','ellas','nosotros','vosotros','yo','tú',
  'algo','alguien','nadie','nada','todo','todos','cada','otro','otra',
  'the','an','of','in','is','it','that','and','for','on','with',
  'he','she','they','are','was','were','have','had','this','but','not',
  'from','by','be','at','to','do','did','has','his','her','its','we',
  'i','you','our','your','their','all','also','just','or','if','as','so',
]);

function zeroScores(): Record<SemanticField, number> {
  return Object.fromEntries(Object.keys(FIELD_COLORS).map(f => [f, 0])) as Record<SemanticField, number>;
}

// Share of content words in a verse (drives animation speed).
function lexicalDensity(line: string): number {
  const words = line.toLowerCase()
    .replace(/[¿¡?!.,;:—–"'""“”''«»()[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 0;
  return words.filter(w => !FUNCTION_WORDS.has(w)).length / words.length;
}

function topOf(vector: ArrayLike<number>): SemanticField {
  let best = -1;
  for (let i = 0; i < vector.length; i++) if (vector[i] > 0 && (best < 0 || vector[i] > vector[best])) best = i;
  return best < 0 ? 'neutral' : EMOTION_IDS[best];
}

function cosine(a: number[], b: number[]): number {
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}

// Approximate stress pattern for a verse: each content word contributes its
// stressed syllable; the pattern is then resampled to the metrical length.
// Rantanplan (see lib/scansion.ts) replaces this with a real scansion.
export function approximateStress(line: string, metricalLength: number): string {
  const words = line
    .replace(/[¿¡?!.,;:—–"'""“”''«»()[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const raw: boolean[] = [];
  for (const w of words) {
    const n = syllablesInWord(w);
    const marks = new Array<boolean>(n).fill(false);
    if (!FUNCTION_WORDS.has(w.toLowerCase())) {
      const st = stressType(w);
      const pos = st === 'aguda' ? n - 1 : st === 'llana' ? n - 2 : n - 3;
      marks[Math.max(0, Math.min(n - 1, pos))] = true;
    }
    raw.push(...marks);
  }
  const len = Math.max(1, metricalLength);
  if (!raw.length) return '-'.repeat(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    const from = Math.floor((i / len) * raw.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) / len) * raw.length));
    out += raw.slice(from, to).some(Boolean) ? '+' : '-';
  }
  // Spanish verse always carries stress on the penultimate metrical syllable.
  if (len >= 2) out = out.slice(0, len - 2) + '+-';
  return out;
}

// ─── Syntagma segmentation ────────────────────────────────────────────────────────────────

// A syntagma is a group of words separated by commas, semicolons, colons,
// or em-dashes. Syllable count is computed on the fragment alone (no
// cross-syntagma sinalefa), then proportionally re-scaled at render time.
function segmentSyntagmas(
  text: string,
  lang: 'es' | 'en' | 'mixed',
  verseVector: ArrayLike<number>,
): ParsedSyntagma[] {
  const parts = text.split(/[,;:—–]/).map(p => p.trim()).filter(Boolean);
  const segments = parts.length > 0 ? parts : [text];
  const engine = getEmotionEngine();

  return segments.map(p => {
    // A syntagma's own words, coloured by the verse it belongs to.
    const { raw } = engine.scoreText(p, lang);
    const mixed = Array.from(raw, (x, i) => x + 0.6 * verseVector[i]);
    const field = topOf(mixed);
    return {
      text: p,
      syllables: Math.max(1, verseSyllables(p, lang)),
      field,
      fieldColor: FIELD_COLORS[field],
    };
  });
}

// ─── Rhyme detection ────────────────────────────────────────────────────────────────────────────

// Returns positions (in the normalized word string) where each vowel nucleus starts.
function vowelNucleiPositions(word: string): number[] {
  let w = word.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return [];
  if (/y$/.test(w)) w = w.slice(0, -1) + 'i';

  const positions: number[] = [];
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    if (!isVowel(c)) { i++; continue; }
    positions.push(i);
    const v1 = c;
    const v2 = w[i + 1];
    const v3 = w[i + 2];
    if (v2 && isVowel(v2)) {
      if (!isHiato(v1, v2)) {
        if (isWeakUnaccented(v1) && STRONG.has(v2) && v3 && isWeakUnaccented(v3)) {
          i += 2;
        } else {
          i++;
        }
      }
    }
    i++;
  }
  return positions;
}

// Returns the character position of the stressed vowel in the normalised word.
// Handles diptongos correctly: in "pierde" (ie = one nucleus), the stressed
// vowel is 'e' at pos 2, not 'i' at pos 1.
function stressedVowelPosition(word: string): number {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!w) return 0;

  // Written accent trumps everything
  for (let i = 0; i < w.length; i++) {
    if ('áéíóú'.includes(w[i])) return i;
  }

  const nuclei = vowelNucleiPositions(word);
  if (nuclei.length === 0) return 0;

  const stress = stressType(word);
  let stressedIdx: number;
  if (stress === 'aguda')      stressedIdx = nuclei.length - 1;
  else if (stress === 'llana') stressedIdx = Math.max(0, nuclei.length - 2);
  else                         stressedIdx = Math.max(0, nuclei.length - 3);

  const nucleusStart = nuclei[stressedIdx];

  // If nucleus is a diptongo, pinpoint the strong (stressed) vowel within it
  if (nucleusStart + 1 < w.length && isVowel(w[nucleusStart + 1])) {
    const v1 = w[nucleusStart];
    const v2 = w[nucleusStart + 1];
    if (!isHiato(v1, v2)) {
      // Diptongo: the strong vowel is the one in STRONG
      if (STRONG.has(v2) && !STRONG.has(v1)) return nucleusStart + 1;
      // else v1 is strong (or both weak — shouldn't occur in standard Spanish)
    }
  }
  return nucleusStart;
}

function getRhymeSignature(word: string): { consonante: string; asonante: string } {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!w) return { consonante: '', asonante: '' };

  const pos = stressedVowelPosition(word);
  const section = w.slice(pos);

  return {
    consonante: section,
    asonante: section.split('').filter(c => isVowel(c)).join(''),
  };
}

export function detectRhymes(allVerses: ParsedVerse[]): RhymeGroup[] {
  const verseData = allVerses.map((v, idx) => {
    const words = v.text
      .replace(/[¡!¿?.,;:—–"'""“”''«»()[\]]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const lastWord = words[words.length - 1] ?? '';
    return { idx, lastWord, sigs: getRhymeSignature(lastWord) };
  });

  const usedIndices = new Set<number>();
  const groups: RhymeGroup[] = [];
  let colorIdx = 0;

  // Phase 1: consonant rhymes (stricter)
  for (let i = 0; i < verseData.length; i++) {
    if (usedIndices.has(i)) continue;
    const sig = verseData[i].sigs.consonante;
    if (!sig || sig.length < 2) continue;

    const matches = verseData.filter(
      (d, j) => j !== i && !usedIndices.has(j) && d.sigs.consonante === sig
    );
    if (matches.length > 0) {
      const indices = [i, ...matches.map(d => d.idx)];
      indices.forEach(idx => usedIndices.add(idx));
      groups.push({
        signature: sig,
        type: 'consonante',
        verseIndices: indices,
        color: RHYME_COLORS[colorIdx % RHYME_COLORS.length],
        groupIndex: colorIdx++,
      });
    }
  }

  // Phase 2: assonant rhymes for remaining verses
  for (let i = 0; i < verseData.length; i++) {
    if (usedIndices.has(i)) continue;
    const sig = verseData[i].sigs.asonante;
    if (!sig || sig.length < 2) continue;

    const matches = verseData.filter(
      (d, j) => j !== i && !usedIndices.has(j) && d.sigs.asonante === sig
    );
    if (matches.length > 0) {
      const indices = [i, ...matches.map(d => d.idx)];
      indices.forEach(idx => usedIndices.add(idx));
      groups.push({
        signature: sig,
        type: 'asonante',
        verseIndices: indices,
        color: RHYME_COLORS[colorIdx % RHYME_COLORS.length],
        groupIndex: colorIdx++,
      });
    }
  }

  return groups;
}

// ─── Form detection ──────────────────────────────────────────────────────────────────────────────────

const METER_NAMES: Record<number, string> = {
  4: 'tetrasílabo', 5: 'pentasílabo', 6: 'hexasílabo',
  7: 'heptasílabo', 8: 'octosílabo',  9: 'eneasílabo',
  10: 'decasílabo', 11: 'endecasílabo', 12: 'dodecasílabo',
  14: 'alejandrino',
};

export function detectForm(counts: number[], stanzas: ParsedStanza[]): PoemForm {
  const total = counts.length;
  if (!total) {
    return { name: 'Verso libre', dominantMeter: 8, meterName: 'octosílabo', regularPercent: 0, isRegular: false };
  }

  const freq: Record<number, number> = {};
  for (const c of counts) freq[c] = (freq[c] ?? 0) + 1;
  const dominantMeter = parseInt(
    Object.entries(freq).sort((a, b) => b[1] - a[1] || parseInt(b[0]) - parseInt(a[0]))[0][0]
  );

  const regular = counts.filter(c => Math.abs(c - dominantMeter) <= 1).length;
  const regularPercent = Math.round((regular / total) * 100);
  const isRegular = regularPercent >= 75;
  const meterName = METER_NAMES[dominantMeter] ?? `${dominantMeter} sílabas`;

  const stanzaSizes = stanzas.map(s => s.verses.length);
  const allSameSize = (size: number) => stanzaSizes.every(s => s === size);

  const has7 = counts.filter(c => c === 7).length;
  const has11 = counts.filter(c => c === 11).length;
  const has7and11 = (has7 + has11) / total > 0.65;

  let name = 'Verso libre';
  if (total === 3 && Math.abs(counts[0]-5)<=1 && Math.abs(counts[1]-7)<=1 && Math.abs(counts[2]-5)<=1) {
    name = 'Haiku';
  } else if (total === 14 && dominantMeter === 11) {
    name = 'Soneto';
  } else if (allSameSize(10) && dominantMeter === 8) {
    name = 'Décima';
  } else if (allSameSize(5) && dominantMeter === 8) {
    name = 'Quintilla';
  } else if (allSameSize(4) && dominantMeter === 8) {
    name = 'Redondilla';
  } else if (allSameSize(4) && dominantMeter === 11) {
    name = 'Cuarteto';
  } else if (allSameSize(3) && dominantMeter === 11) {
    name = 'Tercetos';
  } else if (has7and11) {
    name = 'Silva';
  } else if (dominantMeter === 8 && isRegular && total >= 8) {
    name = 'Romance';
  } else if (dominantMeter === 11 && isRegular) {
    name = 'Endecasílabos';
  } else if (dominantMeter === 14 && isRegular) {
    name = 'Alejandrinos';
  } else if (dominantMeter <= 8 && isRegular) {
    name = 'Arte menor';
  } else if (isRegular) {
    name = meterName.charAt(0).toUpperCase() + meterName.slice(1) + 's';
  }

  return { name, dominantMeter, meterName, regularPercent, isRegular };
}

// ─── Main parser ──────────────────────────────────────────────────────────────────────────────────────

export function parsePoem(text: string): ParsedPoem {
  const rawStanzas = text
    .trim()
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const lang = detectLanguage(text);

  const allLines: string[] = rawStanzas.flatMap(s =>
    s.split('\n').map(l => l.trim()).filter(Boolean)
  );

  const syllableCounts = allLines.map(l => verseSyllables(l, lang));
  const maxSyllables = Math.max(...syllableCounts, 1);
  const minSyllables = Math.min(...syllableCounts.filter(s => s > 0), 1);
  const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / (syllableCounts.length || 1);

  const stanzaLines: string[][] = rawStanzas.map(s =>
    s.split('\n').map(l => l.trim()).filter(Boolean),
  );
  const reading = getEmotionEngine().scorePoem(stanzaLines, lang);

  let globalVerseIdx = 0;
  const stanzas: ParsedStanza[] = [];
  const allVerses: ParsedVerse[] = [];

  for (let si = 0; si < stanzaLines.length; si++) {
    const lines = stanzaLines[si];
    const verses: ParsedVerse[] = [];

    for (let vi = 0; vi < lines.length; vi++) {
      const line = lines[vi];
      const syl = verseSyllables(line, lang);
      const density = lexicalDensity(line);
      const emo = reading.verses[globalVerseIdx];
      const field = emo.top as SemanticField;
      const vector = Array.from(emo.vector);
      const isExclamatory    = /[!¡]/.test(line);
      const isInterrogative  = /[?¿]/.test(line);
      const hasInternalPause = /[,;—–]/.test(line);
      const isEnjambment     = !/[.!?;:—–]$/.test(line.trimEnd());

      // Agitated verses move faster; dense verses slower.
      const speed = 0.3 + (1 - density) * 0.45 + emo.arousal * 0.5;
      const phase = (si * 2.7 + vi * 1.1 + globalVerseIdx * 0.37) % (Math.PI * 2);

      const syntagmas = segmentSyntagmas(line, lang, vector);

      const v: ParsedVerse = {
        text: line,
        syllables: syl,
        normalizedSyllables: syl / maxSyllables,
        field,
        fieldColor: FIELD_COLORS[field],
        density,
        isExclamatory,
        isInterrogative,
        isEnjambment,
        hasInternalPause,
        isMetricalAnomaly: false,
        speed,
        phase,
        stanzaIndex: si,
        verseIndex: globalVerseIdx,
        syntagmas,
        rhymeGroupIndex: -1,
        emotion: {
          vector,
          family: emo.family as EmotionFamily,
          confidence: emo.confidence,
          intensity: emo.intensity,
          valence: emo.valence,
          arousal: emo.arousal,
          hits: emo.hits,
        },
        stress: approximateStress(line, syl),
      };

      verses.push(v);
      allVerses.push(v);
      globalVerseIdx++;
    }

    const emotionVector = EMOTION_IDS.map((_, e) =>
      verses.reduce((s, v) => s + v.emotion.vector[e], 0) / (verses.length || 1));
    const dominantField = topOf(emotionVector);

    const avgDensity = verses.reduce((s, v) => s + v.density, 0) / (verses.length || 1);

    // Contrast: how far the stanza's emotional mix moved from the previous one.
    const prevStanza = stanzas[si - 1];
    let contrastWithPrev = 0;
    if (prevStanza) {
      contrastWithPrev = 1 - cosine(emotionVector, prevStanza.emotionVector);
      const densityDiff = Math.abs(avgDensity - prevStanza.avgDensity);
      contrastWithPrev = Math.min(1, contrastWithPrev + densityDiff * 0.5);
    }

    stanzas.push({ verses, index: si, dominantField, emotionVector, avgDensity, contrastWithPrev });
  }

  // Poem-level reading
  const distribution = zeroScores();
  EMOTION_IDS.forEach((id, e) => { distribution[id] = reading.distribution[e]; });
  const families = Object.fromEntries([
    ...FAMILIES.map(f => [f.id, reading.families[f.id] ?? 0]),
    ['neutral', 0],
  ]) as Record<EmotionFamily, number>;
  const dominantField = reading.top as SemanticField;
  const emotion: PoemEmotionInfo = {
    distribution,
    families,
    valence: reading.valence,
    arousal: reading.arousal,
    arc: allVerses.map(v => ({ valence: v.emotion.valence, arousal: v.emotion.arousal })),
  };

  // Form detection
  const form = detectForm(syllableCounts, stanzas);

  // Metrical anomalies (second pass)
  for (const v of allVerses) {
    v.isMetricalAnomaly = Math.abs(v.syllables - form.dominantMeter) > 2;
  }

  // Rhyme detection (post-processing pass)
  const rhymeGroups = detectRhymes(allVerses);
  for (const group of rhymeGroups) {
    for (const vi of group.verseIndices) {
      const verse = allVerses[vi];
      verse.rhymeGroupIndex = group.groupIndex;
      // Color the last syntagma with the rhyme group color
      if (verse.syntagmas.length > 0) {
        verse.syntagmas[verse.syntagmas.length - 1].rhymeColor = group.color;
      }
    }
  }

  return {
    stanzas,
    allVerses,
    maxSyllables,
    minSyllables,
    avgSyllables,
    dominantField,
    language: lang,
    form,
    rhymeGroups,
    emotion,
    meterSource: 'local',
  };
}

export { FIELD_COLORS, FAMILY_COLORS };
