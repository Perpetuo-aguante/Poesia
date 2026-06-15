// ──────────────────────────────────────────────────────────────────────────────────
// Perpetuo — Poem Parser
// Converts raw poem text into a structured object with metric, rhythmic,
// and semantic/emotional properties that drive the canvas visualiser.
//
// Spanish metric rules implemented:
//   • Sinalefa (synalepha): vowel at end of word + vowel at start of next = −1 syl
//   • Diptongo / hiato / triptongo within words
//   • Coda-stress adjustment: aguda +1, llana ±0, esdrújula −1
//
// Emotion system (13 categories + neutral):
//   nostalgia, inseguridad, miedo, deber, amor, honor, duelo, tristeza,
//   resignación, furia, frustración, optimismo, alegría
//
// Syntagma coloring: each verse is split into rhythmic groups (syntagmas)
//   separated by internal punctuation; each syntagma is colored by its
//   dominant emotion. Rhyming verse-endings share the same color across verses.
// ──────────────────────────────────────────────────────────────────────────────────

export type SemanticField =
  | 'nostalgia'
  | 'inseguridad'
  | 'miedo'
  | 'deber'
  | 'amor'
  | 'honor'
  | 'duelo'
  | 'tristeza'
  | 'resignación'
  | 'furia'
  | 'frustración'
  | 'optimismo'
  | 'alegría'
  | 'neutral';

export interface FieldColor {
  r: number;
  g: number;
  b: number;
}

export interface PoemForm {
  name: string;           // 'Soneto', 'Romance', 'Silva', 'Verso libre', …
  dominantMeter: number;  // most common syllable count, e.g. 11
  meterName: string;      // 'endecasílabo', 'octosílabo', …
  regularPercent: number; // 0–100 — % of verses within ±1 of dominantMeter
  isRegular: boolean;     // regularPercent >= 75
}

// A syntagma is a rhythmic/syntactic group within a verse, separated by
// commas, semicolons, em-dashes, or colons. Each gets its own emotion color.
export interface ParsedSyntagma {
  text: string;
  syllables: number;
  field: SemanticField;
  fieldColor: FieldColor;
  rhymeColor?: FieldColor;  // set on the last syntagma if verse participates in a rhyme group
}

// A rhyme group: verses whose last words share the same terminal sound.
export interface RhymeGroup {
  signature: string;                   // the matching sound (e.g. 'or', 'ao')
  type: 'consonante' | 'asonante';
  verseIndices: number[];              // globalVerseIndex of each verse
  color: FieldColor;
  groupIndex: number;
}

export interface ParsedVerse {
  text: string;
  syllables: number;
  normalizedSyllables: number;    // 0–1 relative to poem max
  field: SemanticField;           // dominant emotion of the whole verse
  fieldColor: FieldColor;
  density: number;                // 0–1 content-word ratio
  isExclamatory: boolean;
  isInterrogative: boolean;
  isEnjambment: boolean;          // no terminal punctuation
  hasInternalPause: boolean;      // comma / semicolon / em-dash
  isMetricalAnomaly: boolean;     // deviates >2 syl from dominant meter
  speed: number;                  // animation speed multiplier
  phase: number;                  // per-column phase offset (radians)
  stanzaIndex: number;
  verseIndex: number;             // global (across all stanzas)
  syntagmas: ParsedSyntagma[];    // rhythmic sub-groups within this verse
  rhymeGroupIndex: number;        // index into poem.rhymeGroups, or -1
}

export interface ParsedStanza {
  verses: ParsedVerse[];
  index: number;
  dominantField: SemanticField;
  avgDensity: number;
  contrastWithPrev: number;       // 0–1 semantic contrast vs prev stanza
}

export interface ParsedPoem {
  stanzas: ParsedStanza[];
  allVerses: ParsedVerse[];
  maxSyllables: number;
  minSyllables: number;
  avgSyllables: number;
  dominantField: SemanticField;
  language: 'es' | 'en' | 'mixed';
  form: PoemForm;
  rhymeGroups: RhymeGroup[];
}

// ─── Semantic / emotion lexicon ─────────────────────────────────────────────────────

const LEXICON: Record<SemanticField, string[]> = {

  nostalgia: [
    'recuerdo','memoria','pasado','antes','ayer','añoranza','lejos','infancia',
    'hogar','viejo','antiguo','regreso','volver','patria','raíz','origen',
    'solía','reminiscencia','evocación','bruma','niebla','tarde','ocaso',
    'niñez','pueblo','retorno','nostalgia','entrañable','querido','adorado',
    'olvidado','distante','lejano','antaño','otrora','recordar','evocar',
    'regresar','añorar','marchado','retornar','añejo','sepia','abuelo',
    'abuela','dulce','tiempos','fue','era','aquellos','entonces','antes',
    'viejos','perdido','ausente','amado','idos','huir','partir','dejado',
  ],

  inseguridad: [
    'duda','quizás','acaso','vacilación','temblor','incertidumbre','frágil',
    'débil','confuso','desorientado','incierto','indeciso','temblar','vacilar',
    'tropezar','abismo','vértigo','nadie','invisible','susurrar','murmurar',
    'dudar','titubear','flaquear','sombra','inquietar','inseguro','vaciar',
    'perderse','hundir','titubeo','quizá','acaso','quién','tal','sabe',
    'puede','nunca','apenas','difícil','imposible','si','no','quizás',
    'flaquear','tambalearse','desvanecerse','borde','precipicio',
  ],

  miedo: [
    'terror','espanto','horror','pánico','susto','aterrar','temer','temblar',
    'oscuridad','noche','amenaza','peligro','huir','escapar','acecho',
    'pesadilla','grito','atroz','trampa','abismo','oscuro','frío','helado',
    'retroceder','esconder','chillar','aullar','acechar','vigilar','bestia',
    'monstruo','tiniebla','oscurecer','amenazar','perseguir','aterrorizar',
    'miedo','temeroso','aterrado','espantoso','horrible','helarse','erizar',
    'temblor','sobresalto','escalofría','erizarse','angustia','angustiar',
  ],

  deber: [
    'deber','obligación','cumplir','responsabilidad','mandato','ley','norma',
    'juramento','promesa','compromiso','servir','obedecer','honrar','patria',
    'empresa','tarea','misión','llamado','imperativo','vocación','obrar',
    'actuar','sacrificio','ofrendar','cargar','tolerar','asumir','necesario',
    'inevitable','recto','moral','ética','imperativo','fidelidad','lealtad',
    'deber','destino','cumplimiento','disciplina','rigor','servicio','sacrificar',
    'dedicar','consagrar','empeñar','jurar','comprometerse','entregar',
  ],

  amor: [
    'amor','amar','querer','corazón','ternura','enamorado','beso','abrazo',
    'caricia','latido','pasión','deseo','adorar','unión','llama','entrega',
    'dulzura','anhelo','suspiro','íntimo','fiel','devoto','sublime','hermoso',
    'tierno','cálido','amante','adorada','sentir','enamorarse','arder',
    'querida','amado','idolatrar','enamorada','amor','pasionar','volcar',
    'devoción','adoración','rendirse','quemarse','fusión','cariño','afecto',
    'terneza','apasionado','encender','inflamar','apasionar',
  ],

  honor: [
    'honor','gloria','dignidad','nobleza','valor','orgullo','virtud',
    'heroísmo','hazaña','laurel','corona','triunfo','mérito','integridad',
    'rectitud','lealtad','gesta','grandeza','inmortal','exaltar','rendir',
    'jurar','defender','proteger','noble','digno','glorioso','heroico',
    'valeroso','venerar','celebrar','épico','imperecedero','venerar',
    'ensalzar','enaltecer','ennoblecer','honra','prez','fama','renombre',
    'reputación','distinción','lustre','heroína','héroe','gesta','epopeya',
  ],

  duelo: [
    'duelo','luto','muerte','morir','perder','pérdida','ausencia','vacío',
    'tumba','sepulcro','entierro','lágrima','llorar','dolor','pena','pesar',
    'despedida','último','final','ceniza','hueso','yerto','quieto','velatorio',
    'orfandad','viudez','desconsuelo','irremediable','irreversible','definitivo',
    'gemir','sollozar','lamentar','fúnebre','difunto','cadáver','eterno',
    'ausente','ido','muerto','fallecer','expirar','perecer','sucumbir',
    'sepultar','enterrar','finado','epitafio','tánatos','réquiem',
  ],

  tristeza: [
    'tristeza','triste','melancolía','sufrir','lágrima','soledad','abatimiento',
    'desolación','gris','pesado','lamento','gemido','angustia','opresión',
    'ahogo','apagar','marchitar','desfallecer','hundir','bajar','pesadumbre',
    'aflicción','congoja','amargura','acongojado','sombra','oscuro','nublado',
    'llanto','penoso','sufriente','desolado','deprimido','abatido','apenado',
    'sufrimiento','quebranto','tribulación','melancolizar','entristecerse',
    'agobian','oprimir','abrumar','afligir','angustiar','desolar',
  ],

  'resignación': [
    'resignación','aceptar','rendirse','ceder','conformar','inevitable',
    'claudicar','silencio','callar','aguantar','soportar','paciencia',
    'adaptarse','limitación','muro','barrera','peso','carga','yugo',
    'quieto','estático','inmóvil','inmutable','pasivo','someterse','inclinarse',
    'resignar','tolerar','sujetar','aceptación','conformarse','renunciar',
    'resignado','tranquilizar','asumir','destinar','fatalismo','fatum',
    'sino','fado','inercia','quietud','remanso','calma','sosiego',
  ],

  furia: [
    'furia','rabia','ira','cólera','enfurecer','rugir','gritar','golpear',
    'destrozar','violento','ardiente','explosión','ardor','incendio',
    'tempestad','tormenta','volcán','trueno','relámpago','bramido','rugido',
    'salvaje','devastar','destruir','arrasar','atacar','empujar','romper',
    'quebrar','sacudir','agitar','iracundo','furioso','rabioso','hervir',
    'ebullición','incendiar','arrebato','vehemencia','impetuoso','ardoroso',
    'desatar','desbordarse','estallido','explosivo','devastación',
  ],

  'frustración': [
    'frustración','fracaso','fallo','inútil','vano','estéril','obstáculo',
    'barrera','impedimento','tropiezo','caída','derrota','fallido','imposible',
    'desilusión','desengaño','decepción','inservible','roto','incompleto',
    'truncado','agotado','desesperanza','desaliento','desanimo','perder',
    'fracasar','maldito','baldío','abortado','frustrar','malograr','errar',
    'fallar','sucumbir','atascarse','estancarse','bloquearse','cerrado',
    'imposibilidad','desilusionar','desencantar','decepcionar',
  ],

  optimismo: [
    'esperanza','posible','mañana','futuro','luz','brillo','florecer','crecer',
    'renovar','nuevo','amanecer','alba','promesa','confianza','fe','lograr',
    'alcanzar','superar','surgir','renacer','brotar','germinar','edificar',
    'construir','elevar','volar','soñar','imaginar','creer','confiar','avanzar',
    'progresar','ascender','iluminar','despertar','comenzar','posibilidad',
    'abrirse','potencial','impulso','aliento','vigor','ímpetu','entusiasmo',
    'ilusión','anhelo','aspirar','anhelar','resurgir','renovación',
  ],

  'alegría': [
    'alegría','gozo','júbilo','celebrar','reír','fiesta','danza','cantar',
    'saltar','vibrar','contento','feliz','dichoso','plenitud','placer',
    'deleite','exultación','risa','euforia','esplendor','brillar','relucir',
    'festejar','compartir','gozar','exultar','pleno','radiante','exuberante',
    'vivo','vital','alegrarse','alborozar','retozar','brincar','sonreír',
    'jovial','regocijo','júbilo','exaltación','vitalidad','desbordante',
    'entusiasmo','animación','efervescente','jocundo','risueño',
  ],

  neutral: [],
};

// ─── Field colors — base palette (Bloques mode) ────────────────────────────────────

const FIELD_COLORS: Record<SemanticField, FieldColor> = {
  nostalgia:      { r: 185, g: 130, b:  70 }, // warm amber/sepia
  inseguridad:    { r: 110, g: 135, b: 105 }, // sage grey-green
  miedo:          { r:  90, g:  20, b: 130 }, // deep purple
  deber:          { r:  55, g:  95, b: 160 }, // steel blue
  amor:           { r: 225, g:  75, b: 110 }, // rose
  honor:          { r: 200, g: 165, b:  15 }, // gold
  duelo:          { r:  65, g:  60, b:  75 }, // near-black purple
  tristeza:       { r:  65, g: 105, b: 190 }, // cerulean blue
  'resignación':  { r: 145, g: 120, b: 175 }, // dusty lavender
  furia:          { r: 230, g:  35, b:  15 }, // intense red-orange
  'frustración':  { r: 195, g:  95, b:  25 }, // burnt sienna
  optimismo:      { r: 105, g: 200, b:  55 }, // spring green
  'alegría':      { r: 245, g: 200, b:  15 }, // sunny yellow
  neutral:        { r: 155, g: 150, b: 140 }, // warm grey
};

// ─── Rhyme group color palette ──────────────────────────────────────────────────────────────

export const RHYME_COLORS: FieldColor[] = [
  { r: 245, g:  80, b:  80 }, // coral red
  { r:   0, g: 185, b: 195 }, // teal cyan
  { r: 230, g: 170, b:   0 }, // gold
  { r: 140, g:  55, b: 255 }, // violet
  { r:  30, g: 190, b:  90 }, // emerald
  { r: 255, g: 120, b:  25 }, // amber orange
  { r:  85, g: 125, b: 255 }, // periwinkle
  { r: 255, g:  60, b: 185 }, // magenta
];

// ─── Language detection ──────────────────────────────────────────────────────────────────────────────────

function detectLanguage(text: string): 'es' | 'en' | 'mixed' {
  const esMarkers = /\b(el|la|los|las|un|una|de|del|que|en|es|y|a|por|con|no|se|me|te|lo|le|su|al|más|pero|como|hay|todo|ser|estar|era|fue|son|han|sus|este|esta|eso|esa|muy|también|donde|cuando|sin|sobre)\b/gi;
  const enMarkers = /\b(the|a|an|of|in|is|it|that|and|for|on|with|he|she|they|are|was|were|have|had|this|but|not|from|by|be|at|to|do|did|has|his|her|its|we|you|your|all|also|just|or|if|as|so)\b/gi;
  const esCount = (text.match(esMarkers) || []).length;
  const enCount = (text.match(enMarkers) || []).length;
  if (esCount > enCount * 1.4) return 'es';
  if (enCount > esCount * 1.4) return 'en';
  return 'mixed';
}

// ─── Spanish syllable counting ─────────────────────────────────────────────────────────────

const STRONG = new Set<string>(['a','e','o','á','é','ó']);
const WEAK   = new Set<string>(['i','u','ü']);
const WEAK_A = new Set<string>(['í','ú']);
const ALL_V  = new Set<string>(['a','e','o','á','é','ó','i','u','ü','í','ú']);

function isVowel(c: string): boolean { return ALL_V.has(c); }
function isWeakUnaccented(c: string): boolean { return WEAK.has(c); }

function isHiato(v1: string, v2: string): boolean {
  if (STRONG.has(v1) && STRONG.has(v2)) return true;
  if (WEAK_A.has(v1) || WEAK_A.has(v2)) return true;
  return false;
}

function syllablesInWord(raw: string): number {
  let w = raw.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return 0;
  if (/y$/.test(w)) w = w.slice(0, -1) + 'i';

  let count = 0;
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    if (!isVowel(c)) { i++; continue; }
    count++;
    const v1 = c;
    const v2 = w[i + 1];
    const v3 = w[i + 2];
    if (v2 && isVowel(v2)) {
      if (!isHiato(v1, v2)) {
        if (isWeakUnaccented(v1) && STRONG.has(v2) && v3 && isWeakUnaccented(v3)) {
          i += 2;
        } else {
          i++;
        }
      }
    }
    i++;
  }
  return Math.max(1, count);
}

type StressType = 'aguda' | 'llana' | 'esdrujula';

function stressType(raw: string): StressType {
  const w = raw.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return 'llana';
  const sylCount = syllablesInWord(raw);
  if (sylCount <= 1) return 'llana';
  const accentMatch = w.match(/[áéíóú]/);
  if (accentMatch) {
    let accentPos = -1;
    for (let i = 0; i < w.length; i++) {
      if ('áéíóú'.includes(w[i])) { accentPos = i; break; }
    }
    let nucleiAfter = 0;
    let i = accentPos + 1;
    while (i < w.length) {
      if (isVowel(w[i])) {
        nucleiAfter++;
        if (i + 1 < w.length && isVowel(w[i + 1]) && !isHiato(w[i], w[i + 1])) {
          i++;
        }
      }
      i++;
    }
    if (nucleiAfter === 0) return 'aguda';
    if (nucleiAfter === 1) return 'llana';
    return 'esdrujula';
  }
  const last = w[w.length - 1];
  if (isVowel(last) || last === 'n' || last === 's') return 'llana';
  return 'aguda';
}

function endsInVowelSound(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return false;
  const last = w[w.length - 1];
  if (last === 'y') return true;
  if (isVowel(last)) return true;
  if (last === 'h' && w.length > 1) return isVowel(w[w.length - 2]);
  return false;
}

function startsWithVowelSound(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return false;
  const first = w[0];
  if (first === 'h') return w.length > 1 && isVowel(w[1]);
  if (first === 'y') return w.length > 1 && isVowel(w[1]) ? false : isVowel(first);
  return isVowel(first);
}

function verseSyllables(line: string, lang: 'es' | 'en' | 'mixed'): number {
  const rawTokens = line.trim().split(/\s+/).filter(Boolean);
  if (!rawTokens.length) return 0;
  if (lang === 'en') {
    return Math.max(1, rawTokens.reduce((s, w) => s + syllablesEnglish(w), 0));
  }
  const tokens: { word: string; pauseAfter: boolean }[] = rawTokens.map(t => ({
    word: t.replace(/[¿¡?!.,;:—–""“”''«»()\[\]]/g, ''),
    pauseAfter: /[,;:—–]/.test(t),
  }));
  const words = tokens.map(t => t.word).filter(Boolean);
  if (!words.length) return 0;
  let total = words.reduce((s, w) => s + syllablesInWord(w), 0);
  for (let i = 0; i < words.length - 1; i++) {
    if (tokens[i].pauseAfter) continue;
    if (endsInVowelSound(words[i]) && startsWithVowelSound(words[i + 1])) {
      total--;
    }
  }
  const lastWord = words[words.length - 1];
  const stress = stressType(lastWord);
  if (stress === 'aguda')    total++;
  if (stress === 'esdrujula') total--;
  return Math.max(1, total);
}

function syllablesEnglish(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

// ─── Semantic / emotion analysis ──────────────────────────────────────────────────────────────────────

const FUNCTION_WORDS = new Set([
  'el','la','los','las','un','una','de','del','que','en','es','y','a',
  'por','con','no','se','me','te','lo','le','su','al','más','pero','como',
  'hay','ser','estar','si','ya','ni','o','u','e','sino','aunque','sobre',
  'entre','hacia','desde','hasta','para','porque','cuando','donde','cuanto',
  'ante','bajo','cabe','tras','según','durante','mediante','via','vs',
  'este','esta','estos','estas','ese','esa','esos','esas','aquel','aquella',
  'mi','tu','él','ella','ellos','ellas','nosotros','vosotros','yo','tú',
  'algo','alguien','nadie','nada','todo','todos','cada','otro','otra',
  'the','an','of','in','is','it','that','and','for','on','with',
  'he','she','they','are','was','were','have','had','this','but','not',
  'from','by','be','at','to','do','did','has','his','her','its','we',
  'i','you','our','your','their','all','also','just','or','if','as','so',
]);

const IRREGULAR_ROOTS: Record<string, string> = {
  'soy':'ser','eres':'ser','somos':'ser','son':'ser',
  'era':'ser','eras':'ser','éramos':'ser','eran':'ser',
  'fui':'ser','fue':'ser','fuimos':'ser','fueron':'ser',
  'voy':'ir','vas':'ir','va':'ir','vamos':'ir','van':'ir',
  'iba':'ir','ibas':'ir','íbamos':'ir','iban':'ir',
  'doy':'dar','das':'dar','da':'dar','damos':'dar','dan':'dar',
  'di':'dar','dio':'dar','dimos':'dar','dieron':'dar',
  'estoy':'estar','estás':'estar','está':'estar','estamos':'estar',
  'hago':'hacer','haces':'hacer','hace':'hacer','hacemos':'hacer',
  'hice':'hacer','hizo':'hacer','hicimos':'hacer',
  'pongo':'poner','pones':'poner','pone':'poner',
  'tengo':'tener','tienes':'tener','tiene':'tener','tenemos':'tener',
  'tuve':'tener','tuvo':'tener','tuvimos':'tener',
  'vengo':'venir','vienes':'venir','viene':'venir','venimos':'venir',
  'vine':'venir','vino':'venir','vinimos':'venir',
  'quiero':'querer','quieres':'querer','quiere':'querer',
  'quise':'querer','quiso':'querer',
  'sigo':'seguir','sigues':'seguir','sigue':'seguir',
  'vuelo':'volar','vuelas':'volar','vuela':'volar',
  'caigo':'caer','cae':'caer','caen':'caer','cayó':'caer','caí':'caer',
  'sé':'saber','sabes':'saber','sabe':'saber',
  'puedo':'poder','puedes':'poder','puede':'poder',
  'digo':'decir','dices':'decir','dice':'decir',
  'veo':'ver','ves':'ver','veía':'ver','veías':'ver',
  'traigo':'traer','traes':'traer','trae':'traer',
  'llevo':'llevar','llevas':'llevar','lleva':'llevar',
  'siento':'sentir','sientes':'sentir','siente':'sentir',
  'muero':'morir','mueres':'morir','muere':'morir',
  'duermo':'dormir','duermes':'dormir','duerme':'dormir',
  'temo':'temer','temes':'temer','teme':'temer',
  'amo':'amar','amas':'amar','ama':'amar','amamos':'amar',
  'sufro':'sufrir','sufres':'sufrir','sufre':'sufrir',
  'lloro':'llorar','lloras':'llorar','llora':'llorar',
  'río':'reír','ríes':'reír','ríe':'reír',
  'canto':'cantar','cantas':'cantar','canta':'cantar',
  'bailo':'bailar','bailas':'bailar','baila':'bailar',
};

function zeroScores(): Record<SemanticField, number> {
  return {
    nostalgia: 0, inseguridad: 0, miedo: 0, deber: 0, amor: 0, honor: 0,
    duelo: 0, tristeza: 0, 'resignación': 0, furia: 0, 'frustración': 0,
    optimismo: 0, 'alegría': 0, neutral: 0,
  };
}

function analyzeVerse(line: string): { field: SemanticField; density: number } {
  const words = line.toLowerCase()
    .replace(/[¿¡?!.,;:—–"'""“”''«»()[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return { field: 'neutral', density: 0 };

  const contentWords = words.filter(w => !FUNCTION_WORDS.has(w));
  const density = contentWords.length / words.length;

  const scores = zeroScores();

  for (const w of contentWords) {
    const root = IRREGULAR_ROOTS[w] ?? w;
    const stem = root
      .replace(/(?:ándose|iéndose|ándome|iéndome)$/, '')
      .replace(/(?:ando|iendo|aron|ieron|aré|eré|iré|aban|ían|emos|éis|ais|ois|aban|rse|ndo|ndose)$/, '')
      .replace(/(?:ado|ido|ar|er|ir|aba|ía)$/, '')
      .replace(/(?:ción|ciones|mente|dad|dades|eza|ismo|ista)$/, '')
      .replace(/(?:es|as|os|s)$/, '');

    for (const [field, lexWords] of Object.entries(LEXICON) as [SemanticField, string[]][]) {
      if (field === 'neutral') continue;
      const match = lexWords.some(lw => {
        if (lw === w || lw === root || lw === stem) return true;
        if (stem.length >= 5 && lw.length >= 5 && stem.startsWith(lw.slice(0, 5))) return true;
        return false;
      });
      if (match) scores[field]++;
    }
  }

  const topField = (Object.entries(scores) as [SemanticField, number][])
    .filter(([f]) => f !== 'neutral')
    .sort((a, b) => b[1] - a[1])[0];

  const field: SemanticField =
    topField && topField[1] > 0 ? topField[0] : 'neutral';

  return { field, density };
}

// ─── Syntagma segmentation ────────────────────────────────────────────────────────────────

// A syntagma is a group of words separated by commas, semicolons, colons,
// or em-dashes. Syllable count is computed on the fragment alone (no
// cross-syntagma sinalefa), then proportionally re-scaled at render time.
function segmentSyntagmas(
  text: string,
  lang: 'es' | 'en' | 'mixed',
): ParsedSyntagma[] {
  const parts = text.split(/[,;:—–]/).map(p => p.trim()).filter(Boolean);

  const segments = parts.length > 0 ? parts : [text];

  return segments.map(p => {
    const { field, density: _density } = analyzeVerse(p);
    return {
      text: p,
      syllables: Math.max(1, verseSyllables(p, lang)),
      field,
      fieldColor: FIELD_COLORS[field],
    };
  });
}

// ─── Rhyme detection ────────────────────────────────────────────────────────────────────────────

// Returns positions (in the normalized word string) where each vowel nucleus starts.
function vowelNucleiPositions(word: string): number[] {
  let w = word.toLowerCase().replace(/[^a-záéíóúüñy]/g, '');
  if (!w) return [];
  if (/y$/.test(w)) w = w.slice(0, -1) + 'i';

  const positions: number[] = [];
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    if (!isVowel(c)) { i++; continue; }
    positions.push(i);
    const v1 = c;
    const v2 = w[i + 1];
    const v3 = w[i + 2];
    if (v2 && isVowel(v2)) {
      if (!isHiato(v1, v2)) {
        if (isWeakUnaccented(v1) && STRONG.has(v2) && v3 && isWeakUnaccented(v3)) {
          i += 2;
        } else {
          i++;
        }
      }
    }
    i++;
  }
  return positions;
}

// Returns the character position of the stressed vowel in the normalised word.
// Handles diptongos correctly: in "pierde" (ie = one nucleus), the stressed
// vowel is 'e' at pos 2, not 'i' at pos 1.
function stressedVowelPosition(word: string): number {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!w) return 0;

  // Written accent trumps everything
  for (let i = 0; i < w.length; i++) {
    if ('áéíóú'.includes(w[i])) return i;
  }

  const nuclei = vowelNucleiPositions(word);
  if (nuclei.length === 0) return 0;

  const stress = stressType(word);
  let stressedIdx: number;
  if (stress === 'aguda')      stressedIdx = nuclei.length - 1;
  else if (stress === 'llana') stressedIdx = Math.max(0, nuclei.length - 2);
  else                         stressedIdx = Math.max(0, nuclei.length - 3);

  const nucleusStart = nuclei[stressedIdx];

  // If nucleus is a diptongo, pinpoint the strong (stressed) vowel within it
  if (nucleusStart + 1 < w.length && isVowel(w[nucleusStart + 1])) {
    const v1 = w[nucleusStart];
    const v2 = w[nucleusStart + 1];
    if (!isHiato(v1, v2)) {
      // Diptongo: the strong vowel is the one in STRONG
      if (STRONG.has(v2) && !STRONG.has(v1)) return nucleusStart + 1;
      // else v1 is strong (or both weak — shouldn't occur in standard Spanish)
    }
  }
  return nucleusStart;
}

function getRhymeSignature(word: string): { consonante: string; asonante: string } {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!w) return { consonante: '', asonante: '' };

  const pos = stressedVowelPosition(word);
  const section = w.slice(pos);

  return {
    consonante: section,
    asonante: section.split('').filter(c => isVowel(c)).join(''),
  };
}

function detectRhymes(allVerses: ParsedVerse[]): RhymeGroup[] {
  const verseData = allVerses.map((v, idx) => {
    const words = v.text
      .replace(/[¡!¿?.,;:—–"'""“”''«»()[\]]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const lastWord = words[words.length - 1] ?? '';
    return { idx, lastWord, sigs: getRhymeSignature(lastWord) };
  });

  const usedIndices = new Set<number>();
  const groups: RhymeGroup[] = [];
  let colorIdx = 0;

  // Phase 1: consonant rhymes (stricter)
  for (let i = 0; i < verseData.length; i++) {
    if (usedIndices.has(i)) continue;
    const sig = verseData[i].sigs.consonante;
    if (!sig || sig.length < 2) continue;

    const matches = verseData.filter(
      (d, j) => j !== i && !usedIndices.has(j) && d.sigs.consonante === sig
    );
    if (matches.length > 0) {
      const indices = [i, ...matches.map(d => d.idx)];
      indices.forEach(idx => usedIndices.add(idx));
      groups.push({
        signature: sig,
        type: 'consonante',
        verseIndices: indices,
        color: RHYME_COLORS[colorIdx % RHYME_COLORS.length],
        groupIndex: colorIdx++,
      });
    }
  }

  // Phase 2: assonant rhymes for remaining verses
  for (let i = 0; i < verseData.length; i++) {
    if (usedIndices.has(i)) continue;
    const sig = verseData[i].sigs.asonante;
    if (!sig || sig.length < 2) continue;

    const matches = verseData.filter(
      (d, j) => j !== i && !usedIndices.has(j) && d.sigs.asonante === sig
    );
    if (matches.length > 0) {
      const indices = [i, ...matches.map(d => d.idx)];
      indices.forEach(idx => usedIndices.add(idx));
      groups.push({
        signature: sig,
        type: 'asonante',
        verseIndices: indices,
        color: RHYME_COLORS[colorIdx % RHYME_COLORS.length],
        groupIndex: colorIdx++,
      });
    }
  }

  return groups;
}

// ─── Form detection ──────────────────────────────────────────────────────────────────────────────────

const METER_NAMES: Record<number, string> = {
  4: 'tetrasílabo', 5: 'pentasílabo', 6: 'hexasílabo',
  7: 'heptasílabo', 8: 'octosílabo',  9: 'eneasílabo',
  10: 'decasílabo', 11: 'endecasílabo', 12: 'dodecasílabo',
  14: 'alejandrino',
};

function detectForm(counts: number[], stanzas: ParsedStanza[]): PoemForm {
  const total = counts.length;
  if (!total) {
    return { name: 'Verso libre', dominantMeter: 8, meterName: 'octosílabo', regularPercent: 0, isRegular: false };
  }

  const freq: Record<number, number> = {};
  for (const c of counts) freq[c] = (freq[c] ?? 0) + 1;
  const dominantMeter = parseInt(
    Object.entries(freq).sort((a, b) => b[1] - a[1] || parseInt(b[0]) - parseInt(a[0]))[0][0]
  );

  const regular = counts.filter(c => Math.abs(c - dominantMeter) <= 1).length;
  const regularPercent = Math.round((regular / total) * 100);
  const isRegular = regularPercent >= 75;
  const meterName = METER_NAMES[dominantMeter] ?? `${dominantMeter} sílabas`;

  const stanzaSizes = stanzas.map(s => s.verses.length);
  const allSameSize = (size: number) => stanzaSizes.every(s => s === size);

  const has7 = counts.filter(c => c === 7).length;
  const has11 = counts.filter(c => c === 11).length;
  const has7and11 = (has7 + has11) / total > 0.65;

  let name = 'Verso libre';
  if (total === 3 && Math.abs(counts[0]-5)<=1 && Math.abs(counts[1]-7)<=1 && Math.abs(counts[2]-5)<=1) {
    name = 'Haiku';
  } else if (total === 14 && dominantMeter === 11) {
    name = 'Soneto';
  } else if (allSameSize(10) && dominantMeter === 8) {
    name = 'Décima';
  } else if (allSameSize(5) && dominantMeter === 8) {
    name = 'Quintilla';
  } else if (allSameSize(4) && dominantMeter === 8) {
    name = 'Redondilla';
  } else if (allSameSize(4) && dominantMeter === 11) {
    name = 'Cuarteto';
  } else if (allSameSize(3) && dominantMeter === 11) {
    name = 'Tercetos';
  } else if (has7and11) {
    name = 'Silva';
  } else if (dominantMeter === 8 && isRegular && total >= 8) {
    name = 'Romance';
  } else if (dominantMeter === 11 && isRegular) {
    name = 'Endecasílabos';
  } else if (dominantMeter === 14 && isRegular) {
    name = 'Alejandrinos';
  } else if (dominantMeter <= 8 && isRegular) {
    name = 'Arte menor';
  } else if (isRegular) {
    name = meterName.charAt(0).toUpperCase() + meterName.slice(1) + 's';
  }

  return { name, dominantMeter, meterName, regularPercent, isRegular };
}

// ─── Main parser ──────────────────────────────────────────────────────────────────────────────────────

export function parsePoem(text: string): ParsedPoem {
  const rawStanzas = text
    .trim()
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const lang = detectLanguage(text);

  const allLines: string[] = rawStanzas.flatMap(s =>
    s.split('\n').map(l => l.trim()).filter(Boolean)
  );

  const syllableCounts = allLines.map(l => verseSyllables(l, lang));
  const maxSyllables = Math.max(...syllableCounts, 1);
  const minSyllables = Math.min(...syllableCounts.filter(s => s > 0), 1);
  const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / (syllableCounts.length || 1);

  let globalVerseIdx = 0;
  const stanzas: ParsedStanza[] = [];
  const allVerses: ParsedVerse[] = [];

  for (let si = 0; si < rawStanzas.length; si++) {
    const lines = rawStanzas[si]
      .split('\n').map(l => l.trim()).filter(Boolean);

    const verses: ParsedVerse[] = [];

    for (let vi = 0; vi < lines.length; vi++) {
      const line = lines[vi];
      const syl = verseSyllables(line, lang);
      const { field, density } = analyzeVerse(line);
      const isExclamatory    = /[!¡]/.test(line);
      const isInterrogative  = /[?¿]/.test(line);
      const hasInternalPause = /[,;—–]/.test(line);
      const isEnjambment     = !/[.!?;:—–]$/.test(line.trimEnd());

      const speed = 0.4 + (1 - density) * 0.6;
      const phase = (si * 2.7 + vi * 1.1 + globalVerseIdx * 0.37) % (Math.PI * 2);

      const syntagmas = segmentSyntagmas(line, lang);

      const v: ParsedVerse = {
        text: line,
        syllables: syl,
        normalizedSyllables: syl / maxSyllables,
        field,
        fieldColor: FIELD_COLORS[field],
        density,
        isExclamatory,
        isInterrogative,
        isEnjambment,
        hasInternalPause,
        isMetricalAnomaly: false,
        speed,
        phase,
        stanzaIndex: si,
        verseIndex: globalVerseIdx,
        syntagmas,
        rhymeGroupIndex: -1,
      };

      verses.push(v);
      allVerses.push(v);
      globalVerseIdx++;
    }

    const fieldFreq = zeroScores();
    verses.forEach(v => { fieldFreq[v.field]++; });
    const dominantField = (Object.entries(fieldFreq) as [SemanticField, number][])
      .sort((a, b) => b[1] - a[1])[0][0];

    const avgDensity = verses.reduce((s, v) => s + v.density, 0) / (verses.length || 1);

    const prevStanza = stanzas[si - 1];
    let contrastWithPrev = 0;
    if (prevStanza) {
      contrastWithPrev = dominantField !== prevStanza.dominantField ? 0.8 : 0.2;
      const densityDiff = Math.abs(avgDensity - prevStanza.avgDensity);
      contrastWithPrev = Math.min(1, contrastWithPrev + densityDiff * 0.5);
    }

    stanzas.push({ verses, index: si, dominantField, avgDensity, contrastWithPrev });
  }

  // Poem-level dominant field
  const globalFreq = zeroScores();
  allVerses.forEach(v => { globalFreq[v.field]++; });
  const dominantField = (Object.entries(globalFreq) as [SemanticField, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  // Form detection
  const form = detectForm(syllableCounts, stanzas);

  // Metrical anomalies (second pass)
  for (const v of allVerses) {
    v.isMetricalAnomaly = Math.abs(v.syllables - form.dominantMeter) > 2;
  }

  // Rhyme detection (post-processing pass)
  const rhymeGroups = detectRhymes(allVerses);
  for (const group of rhymeGroups) {
    for (const vi of group.verseIndices) {
      const verse = allVerses[vi];
      verse.rhymeGroupIndex = group.groupIndex;
      // Color the last syntagma with the rhyme group color
      if (verse.syntagmas.length > 0) {
        verse.syntagmas[verse.syntagmas.length - 1].rhymeColor = group.color;
      }
    }
  }

  return {
    stanzas,
    allVerses,
    maxSyllables,
    minSyllables,
    avgSyllables,
    dominantField,
    language: lang,
    form,
    rhymeGroups,
  };
}

export { FIELD_COLORS };
