'use client';

import { ParsedPoem, SemanticField } from '@/lib/poemParser';

const FIELD_LABELS: Record<SemanticField, string> = {
  nostalgia:     'nostalgia',
  inseguridad:   'inseguridad',
  miedo:         'miedo',
  deber:         'deber',
  amor:          'amor',
  honor:         'honor',
  duelo:         'duelo',
  tristeza:      'tristeza',
  'resignación': 'resignación',
  furia:         'furia',
  'frustración': 'frustración',
  optimismo:     'optimismo',
  'alegría':     'alegría',
  neutral:       'neutro',
};

const FIELD_COLORS_CSS: Record<SemanticField, string> = {
  nostalgia:     'rgb(185,130,70)',
  inseguridad:   'rgb(110,135,105)',
  miedo:         'rgb(90,20,130)',
  deber:         'rgb(55,95,160)',
  amor:          'rgb(225,75,110)',
  honor:         'rgb(200,165,15)',
  duelo:         'rgb(65,60,75)',
  tristeza:      'rgb(65,105,190)',
  'resignación': 'rgb(145,120,175)',
  furia:         'rgb(230,35,15)',
  'frustración': 'rgb(195,95,25)',
  optimismo:     'rgb(105,200,55)',
  'alegría':     'rgb(245,200,15)',
  neutral:       'rgb(155,150,140)',
};

interface Props {
  poem: ParsedPoem;
  visible: boolean;
  onToggle: () => void;
}

export default function PoemLegend({ poem, visible, onToggle }: Props) {
  // Count verses per emotion field
  const counts: Partial<Record<SemanticField, number>> = {};
  for (const v of poem.allVerses) {
    counts[v.field] = (counts[v.field] ?? 0) + 1;
  }

  const total = poem.allVerses.length;
  const fields = (Object.entries(counts) as [SemanticField, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  const hasRhymes = poem.rhymeGroups.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onToggle}
        className="text-xs text-[#0d52a1]/35 hover:text-[#0d52a1]/60 transition-colors text-left"
      >
        {visible ? '▼ leyenda' : '▶ leyenda'}
      </button>

      {visible && (
        <div className="flex flex-col gap-2">

          {/* Emotion fields row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {fields.map(([field, count]) => (
              <div key={field} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: FIELD_COLORS_CSS[field] }}
                />
                <span className="text-[11px] text-[#0d52a1]/55">
                  {FIELD_LABELS[field]}
                  <span className="text-[#0d52a1]/30 ml-1">
                    {Math.round((count / total) * 100)}%
                  </span>
                </span>
              </div>
            ))}

            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[#0d52a1]/10">
              <span className="text-[11px] text-[#0d52a1]/35">
                {total} versos · {poem.stanzas.length} estrofas · ~{Math.round(poem.avgSyllables)} síl./verso
              </span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-[#0d52a1]/10">
              <span className="text-[11px] text-[#0d52a1]/60 font-medium">
                {poem.form.name}
              </span>
              <span className="text-[#0d52a1]/20 text-[11px]">·</span>
              <span className="text-[11px] text-[#0d52a1]/40">
                {poem.form.meterName}
                {!poem.form.isRegular && poem.form.name !== 'Verso libre' ? ' (irregular)' : ''}
              </span>
              <span className="text-[#0d52a1]/20 text-[11px]">·</span>
              <span className="text-[11px] text-[#0d52a1]/25">
                {poem.form.regularPercent}% regular
              </span>
            </div>
          </div>

          {/* Rhyme groups row */}
          {hasRhymes && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-[#0d52a1]/08">
              <span className="text-[11px] text-[#0d52a1]/30 self-center">rima:</span>
              {poem.rhymeGroups.map(group => (
                <div key={group.groupIndex} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{
                      backgroundColor: `rgb(${group.color.r},${group.color.g},${group.color.b})`,
                    }}
                  />
                  <span className="text-[11px] text-[#0d52a1]/50">
                    <span className="font-mono">-{group.signature}</span>
                    <span className="text-[#0d52a1]/25 ml-1 text-[10px]">
                      ({group.type === 'consonante' ? 'cons.' : 'ason.'})
                    </span>
                    <span className="text-[#0d52a1]/25 ml-1 text-[10px]">
                      ×{group.verseIndices.length}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
