// Which lemmas carry the most weight for each emotion across the corpus?
// Useful to spot over-general words that tilt everything (e.g. "oh" → asombro).
//   node --experimental-strip-types emotion-lab/04_contributors.ts [emotion…]
import { readFileSync } from 'node:fs';
import { EmotionEngine } from '../lib/emotions/engine.ts';
const j = (p: string) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const tax = j('lib/emotions/taxonomy.json');
const engine = new EmotionEngine(tax, [j('lib/emotions/lexicon.es.json'), j('lib/emotions/lexicon.en.json')], j('lib/emotions/suffix-rules.json'));
const want = process.argv.slice(2);
const mass = new Map<string, Map<string, number>>();
for (const line of readFileSync(new URL('./data/work/es_verses.jsonl', import.meta.url), 'utf8').split('\n')) {
  if (!line) continue;
  const { hits } = engine.scoreText(JSON.parse(line).text, 'es');
  for (const h of hits) for (const e of h.emotions) {
    if (!mass.has(e.id)) mass.set(e.id, new Map());
    const m = mass.get(e.id)!; m.set(h.lemma, (m.get(h.lemma) ?? 0) + e.weight);
  }
}
const total = [...mass.entries()].map(([k, m]) => [k, [...m.values()].reduce((a, b) => a + b, 0)] as const).sort((a, b) => b[1] - a[1]);
for (const [k, t] of total) {
  if (want.length && !want.includes(k)) continue;
  const top = [...mass.get(k)!.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([l, w]) => `${l} ${(100 * w / t).toFixed(0)}%`).join(', ');
  console.log(`${k.padEnd(12)} ${t.toFixed(0).padStart(6)}  ${top}`);
}
