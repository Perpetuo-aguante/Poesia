// Descriptions of each art piece, kept apart from the components so the
// gallery can list them without loading three.js or the canvas code.

import { ArtMeta } from './types';

export const vasija: ArtMeta = {
  id: 'vasija',
  label: 'Vasija',
  sub: 'partículas en torno al vacío',
  themes: 'vacío, contención, quietud como potencia',
  mappings: [
    'Cada partícula es una sílaba del poema, enrollada en espiral de la base al borde',
    'Las sílabas acentuadas brillan más grandes',
    'Las vueltas de la espiral crecen con el número de versos',
    'La respiración sigue el metro dominante; el giro, la turbulencia emocional',
    'Los cambios bruscos entre estrofas estrechan la vasija como un cuello',
    'La irregularidad métrica deshilacha las paredes',
  ],
};

export const erosion: ArtMeta = {
  id: 'erosion',
  label: 'Erosión',
  sub: 'ASCII · el bloque y el agua',
  themes: 'estructura frente a flujo, la forma que cede',
  mappings: [
    'El bloque está escrito con las letras del poema',
    'Cuanto más regular el metro, más grande y firme el bloque',
    'Los encabalgamientos aceleran la erosión desde los bordes',
    'Cada verso que rompe el metro abre una grieta',
    'Las ondas del agua tienen tantos brazos como estrofas; su frecuencia sigue el metro',
    'La turbulencia emocional agita la corriente',
  ],
};

export const mandala: ArtMeta = {
  id: 'mandala',
  label: 'Rosetón',
  sub: 'rimas como hilos',
  themes: 'eco, simetría, la rima como vínculo',
  mappings: [
    'Cada verso es un radio; su largo es su medida silábica',
    'Cada sílaba es una cuenta; las acentuadas, grandes y del color de su emoción',
    'Los versos que riman se unen con hilos del color de su rima',
    'Los arcos interiores agrupan las estrofas',
    'Un pulso recorre cada verso al ritmo del metro',
    'La turbulencia emocional acelera el giro',
  ],
};

export const cordillera: ArtMeta = {
  id: 'cordillera',
  label: 'Cordillera',
  sub: 'el acento como relieve',
  themes: 'ritmo, peso, la voz que sube y baja',
  mappings: [
    'Cada verso es una cresta; cada sílaba acentuada, un pico',
    'El ancho de la cresta es la medida del verso',
    'La turbulencia afila los picos; la quietud los suaviza',
    'Las estrofas se separan como valles',
    'El color de cada cresta es la emoción de su verso',
    'Los versos que rompen el metro se dibujan con trazo más grueso',
  ],
};

export const corriente: ArtMeta = {
  id: 'corriente',
  label: 'Corriente',
  sub: 'cada rima, un remolino',
  themes: 'deriva, atracción, el poema como cauce',
  mappings: [
    'Cada grupo de rima crea un remolino; los más numerosos atraen con más fuerza',
    'Cada partícula lleva el color emocional de un verso',
    'La turbulencia acelera la corriente; la quietud alarga las estelas',
    'La ondulación del campo sigue el metro dominante',
    'Si el poema encabalga mucho, la corriente no se corta en los bordes',
  ],
};
