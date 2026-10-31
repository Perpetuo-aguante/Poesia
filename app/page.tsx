'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { parsePoem, ParsedPoem } from '@/lib/poemParser';
import { applyScansion, fetchScansion } from '@/lib/scansion';
import PoemInput from '@/components/PoemInput';
import { InputSheet, Loading, Welcome, useWelcomeTokens } from '@/components/cauce/Welcome';
import type { ScanState } from '@/components/cauce/reading/ReadingView';

// The stage is canvas/WebGL only: load it client-side.
const CauceView = dynamic(() => import('@/components/cauce/CauceView'), {
  ssr: false,
  loading: () => <Loading />,
});

export default function Home() {
  const [rawText, setRawText] = useState('');
  const [poem, setPoem] = useState<ParsedPoem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [seedParam, setSeedParam] = useState<string | undefined>(undefined);

  // Wake the scansion service early (free hosts sleep when idle).
  useEffect(() => {
    fetch('/api/analyze').catch(() => undefined);
  }, []);

  // Optional ?seed=12345678 to open a poem with a specific style.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('seed');
    if (q && /^\d{1,8}$/.test(q)) setSeedParam(q.padStart(8, '0'));
  }, []);

  const handleSubmit = useCallback((text: string) => {
    setRawText(text);
    setPoem(parsePoem(text));
    setIsEditing(false);
  }, []);

  // Show the local reading right away, then refine meter and stress with
  // Rantanplan (Spanish only) when the analysis service is available.
  useEffect(() => {
    if (!rawText || poem?.language === 'en' || poem?.meterSource !== 'local') return;
    const controller = new AbortController();
    setScanState('pending');
    fetchScansion(rawText, controller.signal).then(scan => {
      if (controller.signal.aborted) return;
      setScanState(scan ? 'done' : 'unavailable'); // shown in the reading view
      if (!scan) return;
      setPoem(current => (current && current.meterSource === 'local' ? applyScansion(current, scan) : current));
    });
    return () => controller.abort();
  }, [rawText, poem?.language, poem?.meterSource]);

  useWelcomeTokens(!poem && isEditing);

  // ── Landing state: no poem loaded yet ──
  if (!poem) {
    return isEditing ? (
      <InputSheet title="Tu poema">
        <PoemInput onSubmit={handleSubmit} onCancel={() => setIsEditing(false)} autoFocus />
      </InputSheet>
    ) : (
      <Welcome onStart={() => setIsEditing(true)} />
    );
  }

  // ── Main app state: poem loaded ──
  return (
    <>
      <CauceView poem={poem} rawText={rawText} initialSeed={seedParam} scanState={scanState} onAddPoem={() => setIsEditing(true)} />
      {isEditing && (
        <InputSheet title="Cambiar poema">
          <PoemInput
            onSubmit={handleSubmit}
            onCancel={() => setIsEditing(false)}
            initialValue={rawText}
            autoFocus
          />
        </InputSheet>
      )}
    </>
  );
}
