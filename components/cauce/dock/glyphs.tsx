// 24px line glyphs for the dock. Stroke uses currentColor.

const common = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const GLYPHS: Record<string, JSX.Element> = {
  vasija: (
    <svg {...common}>
      <path d="M8.5 3.5h7M9.5 3.5c0 2-3.5 3.5-3.5 8.5 0 4.5 2.6 8.5 6 8.5s6-4 6-8.5c0-5-3.5-6.5-3.5-8.5" />
    </svg>
  ),
  mandala: (
    <svg {...common}>
      <circle cx="12" cy="12" r="2.2" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r1 = 4.2;
        const r2 = i % 2 ? 7.5 : 9.5;
        return <line key={i} x1={12 + Math.cos(a) * r1} y1={12 + Math.sin(a) * r1} x2={12 + Math.cos(a) * r2} y2={12 + Math.sin(a) * r2} />;
      })}
    </svg>
  ),
  cordillera: (
    <svg {...common}>
      <polyline points="2,19 7,10 10,14 14,6 18,13 20,11 22,19" />
    </svg>
  ),
  corriente: (
    <svg {...common}>
      <path d="M3 7.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      <path d="M3 12c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      <path d="M3 16.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
    </svg>
  ),
  erosion: (
    <svg {...common} stroke="none" fill="currentColor">
      {Array.from({ length: 16 }, (_, k) => {
        const x = k % 4;
        const y = Math.floor(k / 4);
        const fade = 1 - (x + y) / 7;
        return <circle key={k} cx={4.5 + x * 5} cy={4.5 + y * 5} r={0.6 + fade * 1.2} opacity={0.25 + fade * 0.75} />;
      })}
    </svg>
  ),
  shuffle: (
    <svg {...common}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <circle cx="8.5" cy="8.5" r="0.9" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="0.9" fill="currentColor" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </svg>
  ),
  read: (
    <svg {...common}>
      <path d="M4 6h16M4 10h16M4 14h11M4 18h7" />
      <circle cx="18.5" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  add: (
    <svg {...common}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};
