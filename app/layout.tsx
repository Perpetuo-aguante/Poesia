import type { Metadata } from 'next';
import { Poppins, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

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
    <html lang="es" className={`${poppins.variable} ${sourceSerif.variable}`}>
      <body className={`min-h-screen bg-[#f7f7f5] ${poppins.className} font-normal`}>{children}</body>
    </html>
  );
}
