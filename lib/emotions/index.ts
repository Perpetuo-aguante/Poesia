// App-side wiring of the emotion engine: loads the taxonomy, lexicons and
// suffix rules (built by emotion-lab/) and exposes a shared engine instance.

import taxonomy from './taxonomy.json';
import lexEs from './lexicon.es.json';
import lexEn from './lexicon.en.json';
import rules from './suffix-rules.json';
import { EmotionEngine, LexiconData, SuffixRulesData, TaxonomyData } from './engine';

export * from './engine';

let engine: EmotionEngine | null = null;

export function getEmotionEngine(): EmotionEngine {
  if (!engine) {
    engine = new EmotionEngine(
      taxonomy as unknown as TaxonomyData,
      [lexEs as unknown as LexiconData, lexEn as unknown as LexiconData],
      rules as unknown as SuffixRulesData,
    );
  }
  return engine;
}

export const EMOTIONS = (taxonomy as unknown as TaxonomyData).emotions;
export const FAMILIES = (taxonomy as unknown as TaxonomyData).families;
