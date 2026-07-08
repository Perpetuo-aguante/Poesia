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
    <div className="flex gap-1">
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`
            flex flex-col items-start px-4 py-2.5 rounded-lg border text-left transition-all
            ${mode === m.id
              ? 'border-[#2a2723]/40 bg-[#2a2723]/[0.06] text-[#2a2723]'
              : 'border-[#2a2723]/12 bg-transparent text-[#2a2723]/40 hover:text-[#2a2723]/70 hover:border-[#2a2723]/25'}
          `}
        >
          <span className="text-sm font-medium leading-tight">{m.label}</span>
          <span className="text-[10px] opacity-60 mt-0.5">{m.sub}</span>
        </button>
      ))}
    </div>
  );
}
