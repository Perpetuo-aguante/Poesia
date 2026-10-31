'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ParsedPoem } from '@/lib/poemParser';
import { emoSlug } from '../tokens';
import { roman } from '../poem-dom/roman';

export type ScanState = 'idle' | 'pending' | 'done' | 'unavailable';

interface Props {
  poem: ParsedPoem;
  scanState: ScanState;
  onClose: () => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const ordinal = (n: number) => `${n}ª`;

function listEs(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// Reading mode: the poem alone, with its scansion laid out verse by verse.
// Everything shown is read from the parsed poem (Rantanplan when available).
export default function ReadingView({ poem, scanState, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Rhyme letters in order of first appearance (A, B, C…), from the rhyme groups.
  const letterOf = useMemo(() => {
    const order = [...poem.rhymeGroups].sort((a, b) => Math.min(...a.verseIndices) - Math.min(...b.verseIndices));
    const map = new Map<number, string>();
    order.forEach((g, i) => map.set(g.groupIndex, LETTERS[i % LETTERS.length]));
    return map;
  }, [poem.rhymeGroups]);

  const verses = poem.allVerses;
  const scheme = poem.stanzas
    .map(st => st.verses.map(v => (v.rhymeGroupIndex >= 0 ? letterOf.get(v.rhymeGroupIndex) : '–')).join(''))
    .join(' ');
  const enjambed = verses.filter(v => v.isEnjambment).length;
  const pauses = verses.filter(v => v.hasInternalPause).length;
  const offMeter = verses.filter(v => v.isMetricalAnomaly).length;
  const title = (verses[0]?.text ?? '').replace(/[\s,;:.—–-]+$/, '');

  const source =
    poem.meterSource === 'rantanplan'
      ? 'Escansión de Rantanplan (POSTDATA · UNED): medida con sinalefas y ley del acento final, patrón acentual y rima.'
      : poem.language === 'en'
        ? 'Rantanplan solo escande español; esta es la lectura del analizador local.'
        : scanState === 'done'
          ? 'Rantanplan respondió, pero dividió los versos de otro modo; se mantiene la lectura del analizador local.'
          : scanState === 'pending'
          ? 'Afinando con Rantanplan… Mientras tanto ves la lectura del analizador local.'
          : 'Rantanplan no respondió; esta es la lectura del analizador local, que puede contar distinto las sinalefas.';

  return (
    <div className="reading" role="dialog" aria-modal="true" aria-labelledby="reading-title">
      <div className="reading-bar">
        <span className="reading-kicker">Lectura y escansión</span>
        <button ref={closeRef} type="button" className="pill-btn ghost" onClick={onClose}>
          Volver a la geometría
        </button>
      </div>

      <article className="reading-inner">
        <header className="reading-head">
          <h2 id="reading-title" className="reading-title">{title}</h2>
          <p className="reading-source" data-state={poem.meterSource === 'rantanplan' ? 'rantanplan' : scanState}>
            {source}
          </p>
        </header>

        <dl className="reading-stats">
          <div>
            <dt>Forma</dt>
            <dd>{poem.form.name}</dd>
          </div>
          <div>
            <dt>Medida dominante</dt>
            <dd>
              {poem.form.dominantMeter} sílabas · {poem.form.meterName}
            </dd>
          </div>
          <div>
            <dt>Regularidad</dt>
            <dd>{Math.round(poem.form.regularPercent)} % de versos en la medida (±1)</dd>
          </div>
          <div>
            <dt>Extremos</dt>
            <dd>
              de {poem.minSyllables} a {poem.maxSyllables} sílabas · promedio {poem.avgSyllables.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt>Esquema de rima</dt>
            <dd className="mono">{poem.rhymeGroups.length ? scheme : 'sin rima detectada'}</dd>
          </div>
          <div>
            <dt>Encabalgamientos</dt>
            <dd>
              {enjambed} de {verses.length} versos
            </dd>
          </div>
          <div>
            <dt>Pausas internas</dt>
            <dd>{pauses} versos</dd>
          </div>
          <div>
            <dt>Fuera de medida</dt>
            <dd>{offMeter ? `${offMeter} ${offMeter === 1 ? 'verso' : 'versos'} (más de 2 sílabas de diferencia)` : 'ninguno'}</dd>
          </div>
        </dl>

        {poem.rhymeGroups.length > 0 && (
          <ul className="reading-rhymes" aria-label="Rimas">
            {[...poem.rhymeGroups]
              .sort((a, b) => (letterOf.get(a.groupIndex) ?? '').localeCompare(letterOf.get(b.groupIndex) ?? ''))
              .map(g => (
                <li key={g.groupIndex}>
                  <span className="rhyme-letter">{letterOf.get(g.groupIndex)}</span>
                  <span className="mono">-{g.signature || '¿?'}</span> · {g.type} · versos{' '}
                  {listEs(g.verseIndices.map(i => String(i + 1)))}
                </li>
              ))}
          </ul>
        )}

        {poem.stanzas.map((st, si) => (
          <section key={st.index} className="reading-stanza" aria-label={`Estrofa ${si + 1}`}>
            <h3 className="reading-numeral">{roman(si + 1)}</h3>
            <ol className="reading-verses" start={st.verses[0]?.verseIndex + 1}>
              {st.verses.map(v => {
                const marks = Array.from(v.stress);
                const tonic = marks.map((c, i) => (c === '+' ? i + 1 : 0)).filter(Boolean);
                const letter = v.rhymeGroupIndex >= 0 ? letterOf.get(v.rhymeGroupIndex) : null;
                const group = v.rhymeGroupIndex >= 0 ? poem.rhymeGroups.find(g => g.groupIndex === v.rhymeGroupIndex) : null;
                return (
                  <li key={v.verseIndex} className="rv">
                    <span className="rv-n">{v.verseIndex + 1}</span>
                    <div className="rv-main">
                      <p className="rv-text">{v.text}</p>
                      <div
                        className="rv-grid"
                        role="img"
                        aria-label={`${v.syllables} sílabas métricas; acentos en ${listEs(tonic.map(ordinal)) || 'ninguna'}`}
                      >
                        {marks.map((c, i) => (
                          <span key={i} className={c === '+' ? 'syl-cell on' : 'syl-cell'}>
                            {c === '+' ? i + 1 : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <dl className="rv-meta">
                      <div>
                        <dt>Medida</dt>
                        <dd>
                          {v.syllables}
                          {v.isMetricalAnomaly && <span className="flag" title="Fuera de la medida dominante"> ≠</span>}
                        </dd>
                      </div>
                      <div>
                        <dt>Acentos</dt>
                        <dd>{tonic.join(' · ') || '—'}</dd>
                      </div>
                      <div>
                        <dt>Rima</dt>
                        <dd>
                          {letter ? (
                            <>
                              <span className="rhyme-letter">{letter}</span> {group?.type === 'asonante' ? 'as.' : 'cons.'}
                            </>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Tono</dt>
                        <dd>
                          <span
                            className="emo-dot"
                            style={{ background: v.field === 'neutral' ? 'var(--color-ink-2)' : `var(--emo-${emoSlug(v.field)})` }}
                            aria-hidden
                          />{' '}
                          {v.field}
                        </dd>
                      </div>
                      <div className="rv-flags">
                        <dt className="sr-only">Notas</dt>
                        <dd>
                          {v.isEnjambment && <span title="Encabalgamiento: el sentido sigue en el verso siguiente">↵ encabalgado</span>}
                          {v.hasInternalPause && <span title="Pausa interna (coma, punto y coma o raya)">‖ pausa</span>}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        <footer className="reading-legend">
          <p>
            <span className="syl-cell on">6</span> sílaba tónica y su posición · <span className="syl-cell" /> sílaba átona ·
            ≠ fuera de la medida dominante · ↵ encabalgamiento · ‖ pausa interna. Las letras marcan el esquema de rima en
            orden de aparición; as. = asonante, cons. = consonante.
          </p>
        </footer>
      </article>
    </div>
  );
}
