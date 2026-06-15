'use client';

import { useState, useRef } from 'react';

interface Props {
  onSubmit: (text: string) => void;
  initialValue?: string;
}

const SAMPLE_POEMS = [
  {
    label: 'Machado · Caminante',
    text: `Caminante, son tus huellas
el camino y nada más;
caminante, no hay camino,
se hace camino al andar.

Al andar se hace el camino,
y al volver la vista atrás
se ve la senda que nunca
se ha de volver a pisar.

Caminante, son tus huellas
el camino y nada más.`,
  },
  {
    label: 'Neruda · Puedo Escribir',
    text: `Puedo escribir los versos más tristes esta noche.
Escribir, por ejemplo: la noche está estrellada,
y tiritan, azules, los astros, a lo lejos.

El viento de la noche gira en el cielo y canta.
Puedo escribir los versos más tristes esta noche.
Yo la quise, y a veces ella también me quería.

En las noches como ésta la tuve entre mis brazos.
La besé tantas veces bajo el cielo infinito.
Ella me quiso, a veces yo también la quería.

Cómo no haber amado sus grandes ojos fijos.`,
  },
  {
    label: 'Paz · Dos Cuerpos',
    text: `Dos cuerpos frente a frente
son a veces dos olas
y la noche es océano.

Dos cuerpos frente a frente
son a veces dos piedras
y la noche desierto.

Dos cuerpos frente a frente
son a veces raíces
en la noche enlazadas.

Dos cuerpos frente a frente
son a veces navajas
y la noche relámpago.`,
  },
  {
    label: 'Keats · Ode to Autumn',
    text: `Season of mists and mellow fruitfulness,
Close bosom-friend of the maturing sun;
Conspiring with him how to load and bless
With fruit the vines that round the thatch-eves run;
To bend with apples the moss'd cottage-trees,
And fill all fruit with ripeness to the core;
To swell the gourd, and plump the hazel shells
With a sweet kernel; to set budding more,
And still more, later flowers for the bees,
Until they think warm days will never cease,
For Summer has o'er-brimm'd their clammy cells.`,
  },
];

export default function PoemInput({ onSubmit, initialValue = '' }: Props) {
  const [text, setText] = useState(initialValue);
  const [expanded, setExpanded] = useState(!initialValue);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text);
    setExpanded(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setText(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSample = (poem: typeof SAMPLE_POEMS[0]) => {
    setText(poem.text);
  };

  if (!expanded) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded(true)}
          className="text-sm text-[#0d52a1]/50 hover:text-[#0d52a1]/80 transition-colors border border-[#0d52a1]/15 hover:border-[#0d52a1]/35 px-3 py-1.5 rounded"
        >
          ← cambiar poema
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Sample poems */}
      <div className="flex flex-wrap gap-2">
        {SAMPLE_POEMS.map(p => (
          <button
            key={p.label}
            onClick={() => handleSample(p)}
            className="text-xs text-[#0d52a1]/45 hover:text-[#0d52a1]/75 border border-[#0d52a1]/15 hover:border-[#0d52a1]/30 px-2.5 py-1 rounded transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Text area */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Pega tu poema aquí — o escríbelo…"
        rows={12}
        className="w-full bg-white border border-[#0d52a1]/15 focus:border-[#0d52a1]/40 text-[#1a1a1a] placeholder:text-[#0d52a1]/25
                   text-sm leading-relaxed font-mono rounded px-4 py-3 resize-none outline-none
                   transition-colors"
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-5 py-2 bg-[#0d52a1] text-white text-sm font-medium rounded
                     hover:bg-[#0a4080] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          visualizar →
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 border border-[#0d52a1]/20 text-[#0d52a1]/55 hover:text-[#0d52a1]/80 hover:border-[#0d52a1]/40
                     text-sm rounded transition-colors"
        >
          subir .txt
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
