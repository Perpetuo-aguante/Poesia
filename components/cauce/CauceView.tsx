'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ParsedPoem } from '@/lib/poemParser';
import { buildFingerprint } from '@/lib/fingerprint';
import { applyTokens, deriveTokens, hashSeed, randomSeed } from './tokens';
import { StageRuntime } from './layers/runtime';
import Stage, { LayerState } from './layers/Stage';
import PoemSpreads from './poem-dom/PoemSpreads';
import Dock from './dock/Dock';
import { SeedChip, Wordmark } from './Chrome';
import ReadingView, { ScanState } from './reading/ReadingView';

interface Props {
  poem: ParsedPoem;
  rawText: string;
  onAddPoem: () => void;
  scanState: ScanState;
  // Lets tests and links pick a seed (?seed=12345678); otherwise hashed from the poem.
  initialSeed?: string;
}

const DEFAULT_LAYERS: LayerState[] = [
  { on: true, opacity: 0.85 }, // Vasija
  { on: true, opacity: 0.7 },  // Rosetón
  { on: false, opacity: 0.6 }, // Cordillera
  { on: true, opacity: 0.55 }, // Corriente
  { on: false, opacity: 0.5 }, // Erosión
];

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

// "Cauce": the visualization is the page and the poem is typeset inside it.
export default function CauceView({ poem, rawText, onAddPoem, initialSeed, scanState }: Props) {
  const [reading, setReading] = useState(false);
  const closeReading = useCallback(() => setReading(false), []);
  const hashed = useMemo(() => hashSeed(rawText), [rawText]);
  const [seed, setSeed] = useState(initialSeed ?? hashed);
  useEffect(() => setSeed(initialSeed ?? hashed), [hashed, initialSeed]);

  const tokens = useMemo(() => deriveTokens(seed), [seed]);
  const reduced = useReducedMotion();
  const fingerprint = useMemo(() => buildFingerprint(poem), [poem]);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);

  const runtime = useMemo(() => new StageRuntime(fingerprint.verses.map(v => v.stanza)), [fingerprint]);
  useEffect(() => {
    runtime.start();
    return () => runtime.dispose();
  }, [runtime]);
  useEffect(() => {
    runtime.motion = reduced ? 'still' : tokens.motion;
  }, [runtime, reduced, tokens.motion]);

  useEffect(() => applyTokens(tokens, reduced), [tokens, reduced]);

  return (
    <div className="cauce">
      <Stage fingerprint={fingerprint} tokens={tokens} runtime={runtime} layers={layers} />
      <div className="grain" aria-hidden />
      <header className="chrome">
        <Wordmark />
        <SeedChip tokens={tokens} isDefault={seed === hashed} />
      </header>
      <main>
        <PoemSpreads poem={poem} runtime={runtime} onRead={() => setReading(true)} />
      </main>
      <Dock layers={layers} onLayers={setLayers} onShuffle={() => setSeed(randomSeed())} onAddPoem={onAddPoem} onRead={() => setReading(true)} />
      {reading && <ReadingView poem={poem} scanState={scanState} onClose={closeReading} />}
    </div>
  );
}
