import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Perpetuo — Visualizador de Poemas',
  description:
    'Un poema convertido en geometría viva. Métrica, ritmo y semántica trazados en el espacio.',
  openGraph: {
    title: 'Perpetuo',
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
    <html lang="es" className={poppins.variable}>
      <body className={`min-h-screen bg-[#f9f6f1] ${poppins.className}`}>{children}</body>
    </html>
  );
}
