import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { ArtMeta, ArtProps } from './types';
import { cordillera, corriente, erosion, mandala, vasija } from './meta';

// To add a piece: create a component that takes ArtProps, describe it in
// meta.ts, and register it here.
export const ART_PIECES: { meta: ArtMeta; Component: ComponentType<ArtProps> }[] = [
  { meta: vasija, Component: dynamic(() => import('./Vasija'), { ssr: false }) },
  { meta: mandala, Component: dynamic(() => import('./MandalaRimas'), { ssr: false }) },
  { meta: cordillera, Component: dynamic(() => import('./Cordillera'), { ssr: false }) },
  { meta: corriente, Component: dynamic(() => import('./Corriente'), { ssr: false }) },
  { meta: erosion, Component: dynamic(() => import('./Erosion'), { ssr: false }) },
];
