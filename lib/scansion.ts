// ──────────────────────────────────────────────────────────────────────────────────
// Perpetuo — Rantanplan scansion
// Merges the scansion returned by analysis-service (Rantanplan) into a poem
// already parsed locally. Rantanplan is more reliable for syllable count and
// stress; emotions and syntagmas still come from the local parser. Rhymes come
// from Rantanplan when it finds them, otherwise the local detection is kept
// (Rantanplan tends to miss romance-style assonance).
// ──────────────────────────────────────────────────────────────────────────────────

import { ParsedPoem, RhymeGroup, RHYME_COLORS, detectForm } from './poemParser';

export interface ScannedVerse {
  text: string;
  syllables: number;
  stress: string;
  rhyme: string | null;
  ending: string | null;
  rhymeType: 'consonant' | 'assonant' | null;
}

export interface ScanResult {
  engine: 'rantanplan';
  structure: string | null;
  verses: ScannedVerse[];
}

export async function fetchScansion(text: string, signal?: AbortSignal): Promise<ScanResult | null> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok || res.status === 204) return null;
    return (await res.json()) as ScanResult;
  } catch {
    return null;
  }
}

export function applyScansion(poem: ParsedPoem, scan: ScanResult): ParsedPoem {
  const verses = poem.allVerses;
  // Only merge when both sides agree on the verses; otherwise keep the local reading.
  if (scan.verses.length !== verses.length) return poem;
  if (scan.verses.some((s, i) => s.text !== verses[i].text || s.syllables <= 0)) return poem;

  const counts = scan.verses.map(s => s.syllables);
  const maxSyllables = Math.max(...counts, 1);
  const minSyllables = Math.min(...counts);
  const avgSyllables = counts.reduce((a, b) => a + b, 0) / counts.length;

  const allVerses = verses.map((v, i) => {
    const s = scan.verses[i];
    const scale = v.syllables > 0 ? s.syllables / v.syllables : 1;
    return {
      ...v,
      syllables: s.syllables,
      normalizedSyllables: s.syllables / maxSyllables,
      stress: s.stress.length === s.syllables ? s.stress : v.stress,
      // Syntagma lengths are drawn proportionally, so rescale them to the new total.
      syntagmas: v.syntagmas.map(sg => ({ ...sg, syllables: Math.max(1, Math.round(sg.syllables * scale)) })),
    };
  });

  const stanzas = poem.stanzas.map(st => ({
    ...st,
    verses: st.verses.map(v => allVerses[v.verseIndex]),
  }));

  const form = detectForm(counts, stanzas);
  for (const v of allVerses) v.isMetricalAnomaly = Math.abs(v.syllables - form.dominantMeter) > 2;

  let rhymeGroups = poem.rhymeGroups;
  const letters = scan.verses.map(s => s.rhyme);
  if (letters.some(Boolean)) {
    const byLetter = new Map<string, number[]>();
    letters.forEach((l, i) => {
      if (!l) return;
      byLetter.set(l, [...(byLetter.get(l) ?? []), i]);
    });
    rhymeGroups = [];
    for (const [, idx] of Array.from(byLetter)) {
      if (idx.length < 2) continue;
      const first = scan.verses[idx[0]];
      const groupIndex = rhymeGroups.length;
      rhymeGroups.push({
        signature: first.ending ?? '',
        type: first.rhymeType === 'assonant' ? 'asonante' : 'consonante',
        verseIndices: idx,
        color: RHYME_COLORS[groupIndex % RHYME_COLORS.length],
        groupIndex,
      } satisfies RhymeGroup);
    }
    for (const v of allVerses) {
      v.rhymeGroupIndex = -1;
      v.syntagmas = v.syntagmas.map(sg => ({ ...sg, rhymeColor: undefined }));
    }
    for (const g of rhymeGroups) {
      for (const vi of g.verseIndices) {
        const v = allVerses[vi];
        v.rhymeGroupIndex = g.groupIndex;
        const last = v.syntagmas.length - 1;
        if (last >= 0) v.syntagmas[last] = { ...v.syntagmas[last], rhymeColor: g.color };
      }
    }
  }

  return {
    ...poem,
    stanzas,
    allVerses,
    maxSyllables,
    minSyllables,
    avgSyllables,
    form,
    rhymeGroups,
    meterSource: 'rantanplan',
  };
}
