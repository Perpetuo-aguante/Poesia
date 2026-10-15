'use client';

import { VisMode } from './PoemVisualizer';

interface Props {
  mode: VisMode;
  onChange: (mode: VisMode) => void;
}

const MODES: { id: VisMode; label: string; sub: string }[] = [
  { id: 'blocks',     label: 'Bloques',     sub: 'hélice cromática' },
  { id: 'pergamino',  label: 'Pergamino',   sub: 'ASCII cálido' },
  { id: 'serigrafia', label: 'Serigrafía',  sub: 'ASCII tipográfico' },
];

export default function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`
            flex flex-col items-start px-4 py-2 rounded-badge border text-left transition-colors font-poppins
            ${mode === m.id
              ? 'border-ink bg-ink text-[#f7f7f5]'
              : 'border-ink/15 bg-transparent text-ink/45 hover:text-ink hover:border-ink/40'}
          `}
        >
          <span className="text-caption tracking-[0.05em] uppercase leading-tight">{m.label}</span>
          <span className="text-[10px] opacity-60 mt-0.5 normal-case">{m.sub}</span>
        </button>
      ))}
    </div>
  );
}
