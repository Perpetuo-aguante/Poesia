'use client';

import { useState, useRef } from 'react';

interface Props {
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  initialValue?: string;
  autoFocus?: boolean;
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

export default function PoemInput({ onSubmit, onCancel, initialValue = '', autoFocus = false }: Props) {
  const [text, setText] = useState(initialValue);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text);
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

  return (
    <div className="pi">
      {/* Text area */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Escribe o pega tu poema aquí. Deja una línea en blanco entre estrofas."
        aria-label="Texto del poema"
        rows={12}
        autoFocus={autoFocus}
        className="pi-text"
      />

      {/* Actions */}
      <div className="pi-actions">
        <button onClick={handleSubmit} disabled={!text.trim()} className="pill-btn">
          Visualizar poema
        </button>

        <button onClick={() => fileRef.current?.click()} className="pill-btn ghost">
          Subir .txt
        </button>

        {onCancel && (
          <button onClick={onCancel} className="pill-btn quiet">
            Cancelar
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* Sample poems */}
      <div className="pi-samples">
        <span className="pi-samples-label">Ejemplos:</span>
        {SAMPLE_POEMS.map(p => (
          <button key={p.label} onClick={() => handleSample(p)} className="chip-btn">
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
