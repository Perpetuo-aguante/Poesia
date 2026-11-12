// ──────────────────────────────────────────────────────────────────────────────────
// Perpetuo — emotion engine
//
// Scores verses against a 40-emotion taxonomy (lib/emotions/taxonomy.json)
// using lexicons built from a 5,000-poem Spanish corpus and a 450-poem English
// corpus (see emotion-lab/). No runtime imports on purpose: the app wires in
// the JSON data (lib/emotions/index.ts) and the evaluation scripts in
// emotion-lab/ load the very same files with Node, so both run identical code.
//
// Per verse:
//   1. tokens → lemma (explicit corpus forms, then ordered suffix rules,
//      then an accent-insensitive fallback for poems typed without tildes)
//   2. lemma → weighted emotions (1.0 explicit, 0.6 strong, 0.3 mild connotation)
//   3. negation ("no", "sin", "nunca"…) dampens a hit and leans it to its
//      `negatedTo` emotion; intensifiers ("tan", "muy"…) boost the next hit
//   4. context: neighbours, stanza and poem bleed into each verse, so a verse
//      without emotional words still reads in the key of its surroundings
// ──────────────────────────────────────────────────────────────────────────────────

export interface EmotionDef {
  id: string;
  family: string;
  valence: number;   // -1 … 1
  arousal: number;   // 0 … 1
  color: [number, number, number];
  negatedTo: string | null;
  desc: string;
}

export interface FamilyDef {
  id: string;
  label: string;
  color: [number, number, number];
}

export interface TaxonomyData {
  families: FamilyDef[];
  emotions: EmotionDef[];
}

// Compact lexicon as stored on disk.
//   lemmas: lemma → flat [emotionIndex, weight×10, emotionIndex, weight×10, …]
//   forms:  surface form → lemma ('' = known form that carries no emotion)
//   stopwords: skipped before any lookup (so "para" never turns into "parir")
export interface LexiconData {
  lang: 'es' | 'en';
  emotions: string[];
  stopwords: string[];
  lemmas: Record<string, number[]>;
  forms: Record<string, string>;
}

export interface SuffixRulesData {
  minStem: number;
  es: [string, string][];
  en: [string, string][];
}

export type EmotionVector = Float32Array;

export interface LexHit {
  token: string;
  lemma: string;
  emotions: { id: string; weight: number }[];
  negated: boolean;
}

export interface VerseEmotion {
  raw: EmotionVector;       // the verse's own lexical charge
  vector: EmotionVector;    // with context, normalised to sum 1 (zeros if none)
  top: string;              // dominant emotion id, or 'neutral'
  family: string;           // family of `top`, or 'neutral'
  confidence: number;       // 0–1: share of the top emotion in `vector`
  intensity: number;        // 0–1: how charged the verse itself is
  valence: number;          // -1 … 1
  arousal: number;          // 0 … 1
  hits: LexHit[];
}

export interface PoemEmotion {
  verses: VerseEmotion[];
  distribution: EmotionVector;            // sums to 1 (zeros if no hits at all)
  families: Record<string, number>;       // sums to 1
  top: string;
  valence: number;
  arousal: number;
}

// ─── Function words, negators, intensifiers ─────────────────────────────────────

const NEGATORS = new Set([
  // "nada" and "nadie" are left out: in poetry they are mostly nouns of their
  // own ("la nada", "no hay nadie") and carry desolación / soledad.
  'no', 'ni', 'nunca', 'jamás', 'jamas', 'sin', 'tampoco', 'ningún', 'ninguna', 'ninguno',
  'not', 'never', 'nor', 'without', 'none',
]);

const INTENSIFIERS = new Set([
  'tan', 'tanto', 'tanta', 'tantos', 'tantas', 'muy', 'demasiado', 'demasiada', 'cuán', 'cuánto', 'cuánta',
  'tal', 'sumo', 'harto', 'so', 'such', 'very', 'too', 'most', 'utterly', 'deeply', 'ever',
]);

const NEGATION_SPAN = 3;          // content words affected after a negator
const NEG_KEEP = 0.25;            // what a negated emotion keeps
const NEG_SHIFT = 0.6;            // what moves to its negatedTo emotion
const INTENSIFY = 1.35;

// ─── Engine ─────────────────────────────────────────────────────────────────────

export function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

class LexiconIndex {
  readonly lemmas: Map<string, Float32Array>;
  readonly forms: Map<string, string>;
  readonly plainLemmas = new Map<string, string>();
  readonly plainForms = new Map<string, string>();
  readonly stop: Set<string>;
  private readonly rules: [string, string][];
  private readonly minStem: number;

  // (No parameter properties: Node's type stripping, used by emotion-lab/, rejects them.)
  constructor(data: LexiconData, rules: [string, string][], minStem: number, emotionIndex: Map<string, number>) {
    this.rules = rules;
    this.minStem = minStem;
    this.stop = new Set(data.stopwords ?? []);
    const n = emotionIndex.size;
    const remap = data.emotions.map(id => emotionIndex.get(id) ?? -1);
    this.lemmas = new Map();
    for (const [lemma, flat] of Object.entries(data.lemmas)) {
      const v = new Float32Array(n);
      for (let i = 0; i < flat.length; i += 2) {
        const e = remap[flat[i]];
        if (e >= 0) v[e] = flat[i + 1] / 10;
      }
      this.lemmas.set(lemma, v);
      const plain = deaccent(lemma);
      if (plain !== lemma && !this.plainLemmas.has(plain)) this.plainLemmas.set(plain, lemma);
    }
    this.forms = new Map(Object.entries(data.forms));
    this.forms.forEach((lemma, form) => {
      const plain = deaccent(form);
      if (plain !== form && !this.plainForms.has(plain)) this.plainForms.set(plain, lemma);
    });
  }

  private byRules(w: string, has: (c: string) => boolean): string | null {
    for (const [suf, rep] of this.rules) {
      if (w.length - suf.length >= this.minStem && w.endsWith(suf)) {
        const c = w.slice(0, w.length - suf.length) + rep;
        if (has(c)) return c;
      }
    }
    return null;
  }

  lemmaOf(word: string): string | null {
    if (this.stop.has(word)) return null;
    const f = this.forms.get(word);
    if (f !== undefined) return f || null;
    if (this.lemmas.has(word)) return word;
    const viaRules = this.byRules(word, c => this.lemmas.has(c));
    if (viaRules) return viaRules;
    // Accent-insensitive fallback ("melancolia", "corazon", "lagrimas").
    const plain = deaccent(word);
    const pf = this.plainForms.get(plain);
    if (pf !== undefined) return pf || null;
    const pl = this.plainLemmas.get(plain);
    if (pl) return pl;
    const viaPlain = this.byRules(plain, c => this.plainLemmas.has(c));
    return viaPlain ? this.plainLemmas.get(viaPlain)! : null;
  }
}

export class EmotionEngine {
  readonly emotions: EmotionDef[];
  readonly families: FamilyDef[];
  readonly index: Map<string, number>;
  private readonly valence: Float32Array;
  private readonly arousal: Float32Array;
  private readonly negatedTo: Int16Array;
  private readonly lex: Partial<Record<'es' | 'en', LexiconIndex>> = {};

  constructor(tax: TaxonomyData, lexicons: LexiconData[], rules: SuffixRulesData) {
    this.emotions = tax.emotions;
    this.families = tax.families;
    this.index = new Map(tax.emotions.map((e, i) => [e.id, i]));
    this.valence = Float32Array.from(tax.emotions, e => e.valence);
    this.arousal = Float32Array.from(tax.emotions, e => e.arousal);
    this.negatedTo = Int16Array.from(tax.emotions, e => (e.negatedTo ? this.index.get(e.negatedTo) ?? -1 : -1));
    for (const l of lexicons) this.lex[l.lang] = new LexiconIndex(l, rules[l.lang], rules.minStem, this.index);
  }

  get size(): number { return this.emotions.length; }

  zero(): EmotionVector { return new Float32Array(this.emotions.length); }

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[’']/g, "'")
      .split(/[^a-záéíóúüñàèìòùâêîôûç']+/i)
      .map(t => t.replace(/^'+|'+$/g, ''))
      .filter(Boolean);
  }

  private lookup(token: string, lang: 'es' | 'en' | 'mixed'): { lemma: string; v: Float32Array } | null {
    const order: ('es' | 'en')[] = lang === 'en' ? ['en', 'es'] : lang === 'es' ? ['es'] : ['es', 'en'];
    for (const l of order) {
      const idx = this.lex[l];
      if (!idx) continue;
      const lemma = idx.lemmaOf(token);
      if (lemma) {
        const v = idx.lemmas.get(lemma);
        if (v) return { lemma, v };
      }
    }
    return null;
  }

  // Lexical charge of a fragment of text (no context).
  scoreText(text: string, lang: 'es' | 'en' | 'mixed' = 'es'): { raw: EmotionVector; hits: LexHit[] } {
    const raw = this.zero();
    const hits: LexHit[] = [];
    let negLeft = 0;
    let boost = 1;
    for (const tok of this.tokenize(text)) {
      if (NEGATORS.has(tok) || tok.endsWith("n't")) { negLeft = NEGATION_SPAN; continue; }
      if (INTENSIFIERS.has(tok)) { boost = INTENSIFY; continue; }
      const found = tok.length > 1 ? this.lookup(tok, lang) : null;
      if (found) {
        const negated = negLeft > 0;
        const emotions: LexHit['emotions'] = [];
        for (let e = 0; e < found.v.length; e++) {
          const w = found.v[e];
          if (!w) continue;
          emotions.push({ id: this.emotions[e].id, weight: w });
          if (negated) {
            raw[e] += w * NEG_KEEP;
            const to = this.negatedTo[e];
            if (to >= 0) raw[to] += w * NEG_SHIFT;
          } else {
            raw[e] += w * boost;
          }
        }
        hits.push({ token: tok, lemma: found.lemma, emotions, negated });
        boost = 1;
      }
      if (negLeft > 0) negLeft--;
    }
    return { raw, hits };
  }

  describe(vector: EmotionVector, ownCharge: number, text = ''): Omit<VerseEmotion, 'raw' | 'hits'> {
    const total = vector.reduce((s, x) => s + x, 0);
    const norm = this.zero();
    if (total > 0) for (let i = 0; i < norm.length; i++) norm[i] = vector[i] / total;
    let best = -1;
    for (let i = 0; i < norm.length; i++) if (best < 0 || norm[i] > norm[best]) best = i;
    const neutral = total < MIN_CHARGE;
    let valence = 0, arousal = 0;
    for (let i = 0; i < norm.length; i++) { valence += norm[i] * this.valence[i]; arousal += norm[i] * this.arousal[i]; }
    if (neutral) arousal = 0.3;
    if (/[!¡]/.test(text)) arousal = Math.min(1, arousal + 0.15);
    if (/[?¿]/.test(text)) arousal = Math.min(1, arousal + 0.05);
    return {
      vector: neutral ? this.zero() : norm,
      top: neutral ? 'neutral' : this.emotions[best].id,
      family: neutral ? 'neutral' : this.emotions[best].family,
      confidence: neutral ? 0 : norm[best],
      intensity: Math.min(1, ownCharge / 1.5),
      valence: neutral ? 0 : valence,
      arousal,
    };
  }

  // Score a whole poem: stanzas of verse lines.
  scorePoem(stanzas: string[][], lang: 'es' | 'en' | 'mixed' = 'es'): PoemEmotion {
    const flat: { text: string; stanza: number }[] = [];
    stanzas.forEach((s, si) => s.forEach(text => flat.push({ text, stanza: si })));
    const scored = flat.map(v => this.scoreText(v.text, lang));
    const n = this.size;

    const poemMean = this.zero();
    const stanzaMean = stanzas.map(() => this.zero());
    const stanzaCount = stanzas.map(s => Math.max(1, s.length));
    scored.forEach((s, i) => {
      for (let e = 0; e < n; e++) {
        poemMean[e] += s.raw[e] / Math.max(1, flat.length);
        stanzaMean[flat[i].stanza][e] += s.raw[e] / stanzaCount[flat[i].stanza];
      }
    });

    const verses: VerseEmotion[] = scored.map((s, i) => {
      const ctx = this.zero();
      const prev = i > 0 && flat[i - 1].stanza === flat[i].stanza ? scored[i - 1].raw : null;
      const next = i + 1 < flat.length && flat[i + 1].stanza === flat[i].stanza ? scored[i + 1].raw : null;
      for (let e = 0; e < n; e++) {
        ctx[e] = s.raw[e]
          + NEIGHBOUR * ((prev?.[e] ?? 0) + (next?.[e] ?? 0))
          + STANZA * stanzaMean[flat[i].stanza][e]
          + POEM * poemMean[e];
      }
      const own = s.raw.reduce((a, x) => a + x, 0);
      return { raw: s.raw, hits: s.hits, ...this.describe(ctx, own, flat[i].text) };
    });

    const dist = this.zero();
    for (const v of verses) for (let e = 0; e < n; e++) dist[e] += v.vector[e];
    const d = this.describe(dist, 1);
    const families: Record<string, number> = Object.fromEntries(this.families.map(f => [f.id, 0]));
    for (let e = 0; e < n; e++) families[this.emotions[e].family] += d.vector[e];
    return { verses, distribution: d.vector, families, top: d.top, valence: d.valence, arousal: d.arousal };
  }
}

// Context weights and the neutral threshold (tuned in emotion-lab/03_evaluate.ts).
const NEIGHBOUR = 0.35;
const STANZA = 0.25;
const POEM = 0.15;
const MIN_CHARGE = 0.12;
