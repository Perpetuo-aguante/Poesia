'use client';

import { ParsedPoem } from '@/lib/poemParser';

interface Props {
  poem: ParsedPoem;
}

export default function PoemReading({ poem }: Props) {
  const stanzaSizes = poem.stanzas.map(s => s.verses.length);

  return (
    <div className="w-full max-w-[720px] mx-auto flex flex-col gap-8 text-ink">

      {/* Type & structure summary */}
      <div className="flex flex-col gap-2 text-center">
        <p className="text-subheading font-serif font-normal tracking-tight">
          {poem.form.name}
          <span className="text-ink/40"> · </span>
          {poem.form.meterName}
          {!poem.form.isRegular && poem.form.name !== 'Verso libre' ? ' irregular' : ''}
        </p>
        <p className="text-caption tracking-[0.05em] text-ink/45 font-poppins uppercase">
          {poem.stanzas.length} {poem.stanzas.length === 1 ? 'estrofa' : 'estrofas'}
          {' · '}
          {stanzaSizes.join('-')} {stanzaSizes.every(n => n === 1) ? 'verso' : 'versos'} por estrofa
          {' · '}
          promedio {poem.avgSyllables.toFixed(1)} sílabas/verso
        </p>
      </div>

      {/* Per-verse syllable reading */}
      <div className="flex flex-col gap-6">
        {poem.stanzas.map(stanza => (
          <div key={stanza.index} className="flex flex-col gap-1">
            {stanza.verses.map(v => (
              <div
                key={v.verseIndex}
                className="flex items-baseline gap-3 py-1 border-b border-ink/[0.08]"
              >
                <span className="flex-1 text-[15px] leading-relaxed font-serif italic">
                  {v.text}
                </span>
                <span className="text-caption text-ink/40 font-poppins tabular-nums whitespace-nowrap">
                  {v.syllables} síl.
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
