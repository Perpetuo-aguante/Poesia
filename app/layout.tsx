import type { Metadata } from 'next';
// Self-hosted type for the Cauce system (latin subset, woff2, font-display: swap).
// Browsers only download the faces the active tokens use.
import '@fontsource/fraunces/latin-900.css';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-400-italic.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/playfair-display/latin-900-italic.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-400-italic.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/bodoni-moda/latin-900.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-400-italic.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/syne/latin-800.css';
import './globals.css';
import './cauce.css';

export const metadata: Metadata = {
  title: 'Geometría Poética',
  description:
    'Un poema convertido en geometría viva. Métrica, ritmo y semántica trazados en el espacio.',
  openGraph: {
    title: 'Geometría Poética',
    description: 'Geometría viva de la poesía',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
