'use client';

import { CSSProperties, useEffect, useRef, useState } from 'react';
import type { ParsedPoem } from '@/lib/poemParser';
import type { StageRuntime } from '../layers/runtime';
import { emoSlug } from '../tokens';
import { roman } from './roman';
import ScrollRail, { RailTick } from './ScrollRail';

interface Props {
  poem: ParsedPoem;
  runtime: StageRuntime;
  onRead: () => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function emoVar(field: string) {
  return field === 'neutral' ? 'var(--color-ink)' : `var(--emo-${emoSlug(field)})`;
}

// The poem typeset over the stage: an opening spread, then one spread per
// stanza. Scrolling is the page turn; the stanza nearest the centre is active.
export default function PoemSpreads({ poem, runtime, onRead }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [ticks, setTicks] = useState<RailTick[]>([]);

  const avg = poem.avgSyllables || 1;
  const first = poem.allVerses[0]?.text ?? '';
  const title = first.replace(/[\s,;:.—–-]+$/, '');
  const count = poem.allVerses.length;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const spreads = Array.from(root.querySelectorAll<HTMLElement>('.spread'));
    let geo: { top: number; h: number }[] = [];
    let maxScroll = 1;
    let active = -2;
    let raf = 0;

    const measure = () => {
      const y = window.scrollY;
      geo = spreads.map(el => {
        const r = el.getBoundingClientRect();
        return { top: r.top + y, h: r.height };
      });
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setTicks(
        poem.stanzas.map((s, i) => {
          const g = geo[i + 1];
          return {
            at: clamp((g.top + g.h / 2 - window.innerHeight / 2) / maxScroll, 0, 1),
            color: emoVar(s.dominantField),
            label: `Estrofa ${roman(i + 1)}`,
          };
        }),
      );
      update();
    };

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const center = y + vh / 2;
      let best = -1;
      let bestD = Infinity;
      geo.forEach((g, i) => {
        const d = (g.top + g.h / 2 - center) / vh;
        const near = clamp(1 - Math.abs(d) * 1.15, 0, 1);
        spreads[i].style.setProperty('--near', near.toFixed(3));
        spreads[i].style.setProperty('--dir', d < 0 ? '-1' : '1');
        if (Math.abs(d) < bestD) {
          bestD = Math.abs(d);
          best = i;
        }
      });
      const stanza = best - 1; // spread 0 is the opening
      if (stanza !== active) {
        spreads.forEach((el, i) => el.classList.toggle('is-active', i === best));
        active = stanza;
      }
      runtime.opening = best <= 0;
      runtime.activeStanza = stanza;
      runtime.scrollSteps = Math.round(y / (vh * 0.25));
      thumbRef.current?.style.setProperty('--p', (y / maxScroll).toFixed(4));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    window.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [poem, runtime]);

  const source = poem.meterSource === 'rantanplan' ? 'métrica de Rantanplan' : 'métrica local';

  return (
    <>
      <div ref={rootRef} className="poem" lang={poem.language === 'en' ? 'en' : 'es'}>
        <section className="spread opening" data-i={0}>
          <div className="opening-block">
            <h1 className="opening-title" style={{ '--title-chars': Math.max(8, title.length) } as CSSProperties}>
              {title}
            </h1>
            <p className="mono-line">
              {poem.form.name} · {poem.form.meterName} · {count} {count === 1 ? 'verso' : 'versos'} ·{' '}
              {poem.stanzas.length} {poem.stanzas.length === 1 ? 'estrofa' : 'estrofas'} · {source}
            </p>
          </div>
        </section>

        {poem.stanzas.map((stanza, si) => {
          const n = stanza.verses.length;
          return (
            <section
              key={stanza.index}
              className="spread"
              data-i={si + 1}
              data-side={si % 2 ? 'right' : 'left'}
              style={{ '--si': si % 5 } as CSSProperties}
              aria-label={`Estrofa ${si + 1}`}
            >
              <div className="stanza" data-short={n < 4 ? '' : undefined} data-flow={n > 6 ? '' : undefined}>
                <span className="numeral" aria-hidden>{roman(si + 1)}</span>
                {stanza.verses.map((v, vi) => {
                  const k = v.syllables > 0 ? clamp(Math.sqrt(avg / v.syllables), 0.7, 2.1) : 1;
                  return (
                    <p
                      key={v.verseIndex}
                      className={vi === 0 ? 'verse opener' : 'verse'}
                      style={{ '--k': k.toFixed(3), '--vi': vi, color: emoVar(v.field) } as CSSProperties}
                      onPointerEnter={() => (runtime.hovered = v.verseIndex)}
                      onPointerLeave={() => runtime.hovered === v.verseIndex && (runtime.hovered = -1)}
                    >
                      <span className="vt" data-note={`${v.field} · ${v.syllables} síl.`}>{v.text}</span>
                      <span className="syl" aria-hidden>{v.syllables}</span>
                    </p>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="spread closing" data-i={poem.stanzas.length + 1}>
          <div className="closing-block">
            <p className="mono-line">Fin del poema</p>
            <button type="button" className="pill-btn" onClick={onRead}>
              Leer con su escansión
            </button>
          </div>
        </section>
      </div>
      <ScrollRail ticks={ticks} thumbRef={thumbRef} />
    </>
  );
}
