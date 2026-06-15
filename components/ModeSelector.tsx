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
            flex flex-col items-start px-4 py-2.5 rounded border text-left transition-all
            ${mode === m.id
              ? 'border-[#0d52a1]/50 bg-[#0d52a1]/8 text-[#0d52a1]'
              : 'border-[#0d52a1]/15 bg-transparent text-[#0d52a1]/45 hover:text-[#0d52a1]/70 hover:border-[#0d52a1]/30'}
          `}
        >
          <span className="text-sm font-medium leading-tight">{m.label}</span>
          <span className="text-[10px] opacity-60 mt-0.5">{m.sub}</span>
        </button>
      ))}
    </div>
  );
}
