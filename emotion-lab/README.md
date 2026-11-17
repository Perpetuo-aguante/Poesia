# emotion-lab

Builds the emotion lexicons the app uses to read the emotional tone of a poem,
and measures how well they work. The app side lives in `lib/emotions/`.

## What it produces

- **Taxonomy** (`lib/emotions/taxonomy.json`): 40 emotions in 9 families.
  Each emotion has a valence (−1 painful … 1 pleasant), an arousal level
  (0 still … 1 agitated), a color, and a `negatedTo` emotion ("sin esperanza"
  leans to desolación). The 13 emotions of the first version keep their names
  and colors.

  | family | emotions |
  |---|---|
  | alegría | alegría, júbilo, gozo, serenidad, gratitud |
  | amor | amor, deseo, ternura, devoción, celos |
  | esperanza | optimismo, esperanza, anhelo |
  | asombro | asombro, misterio, éxtasis |
  | tristeza | tristeza, melancolía, soledad, nostalgia, duelo, desolación |
  | miedo | miedo, angustia, inseguridad, desamparo |
  | ira | furia, frustración, rencor, indignación |
  | rechazo | desprecio, asco, hastío, desengaño |
  | conciencia | deber, honor, orgullo, culpa, vergüenza, resignación |

- **Lexicons** (`lib/emotions/lexicon.{es,en}.json`): about 3,800 Spanish
  and 1,700 English lemmas, each mapped to up to 3 emotions. Weights are 1.0
  for an explicit emotion word (*llanto*), 0.6 for a strong poetic connotation
  (*ceniza*, *alba*), and 0.3 for a mild one (*noche*, *mar*). The two files
  are 90 KB and 34 KB.
- **Engine** (`lib/emotions/engine.ts`): turns each word into a lemma, adds
  up the emotion weights, and handles negation and intensifiers. Context from
  the neighbouring verses, the stanza and the poem then bleeds in, so a verse
  without emotional words reads in the key of its surroundings. Each verse gets
  a 40-value emotion vector, plus valence, arousal, intensity, and the words
  that triggered it.

## Data

| corpus | use |
|---|---|
| [Spanish poetry dataset](https://www.kaggle.com/datasets/andreamorgar/spanish-poetry-dataset) (5,133 poems: Neruda, Góngora, Benedetti, Lorca, Lope, Mistral, Darío…). The same file is at `raw.githubusercontent.com/andreamorgar/poesIA/master/data/poems.csv`. | Vocabulary to label, word forms for the browser lemmatizer, word-vector propagation, evaluation. |
| [Poem dataset (mexwell)](https://www.kaggle.com/datasets/mexwell/poem-dataset), `final_df_emotions(remove-bias).csv` (450 English poems labeled with 7 classes: anger, disgust, fear, joy, neutral, sadness, surprise). | Vocabulary for the English lexicon, plus an external check of the engine. Its labels come from an automatic classifier, not from human readers. |

The raw files are not committed (`emotion-lab/data/` is git-ignored). To
rebuild, put them in `emotion-lab/data/raw/` as `poems_es.csv` and
`poems_en_emotions.csv`.

## How the lexicon was built

1. `01_lemmatize.py`: lemmatizes the Spanish corpus with spaCy
   (`es_core_news_lg`) and counts lemmas and surface forms.
2. **Labeling.** Every lemma that appears at least 15 times (~3,700 of them)
   was labeled by hand by Claude agents following `GUIDELINES.md`. That pass
   was followed by about 2,000 rarer, explicitly emotional words, including
   Siglo de Oro and modernista vocabulary (*congoja*, *zozobra*, *hastío*,
   *oropel*). English got the same treatment. The labels live in `labels/`
   and are meant to be edited:
   - `labels/es/zz_overrides.tsv` has the final say. A line with no label
     removes a word.
3. `02_build_lexicon.py`:
   - Merges the labels.
   - Propagates them to about 500 rarer corpus lemmas through spaCy word
     vectors. A propagated emotion needs two agreeing labeled neighbours and
     always gets a low weight; adverbs are excluded.
   - Writes the JSON files the app loads.

   The browser has no spaCy, so it guesses lemmas with the ordered suffix
   rules in `lib/emotions/suffix-rules.json`. The build stores an explicit
   override for every corpus form whose emotional lemma those rules would
   miss. Poems typed without accents still match ("melancolia", "corazon").
4. `03_evaluate.ts`: runs the app's own engine (via Node) and writes
   `REPORT.md`. `04_contributors.ts` lists which words carry each emotion
   across the corpus, which is the quickest way to spot a word that tilts
   everything. For example, *qué* was once 71% of asombro, before stop words
   were filtered out.

## Results

See [`REPORT.md`](./REPORT.md). In short:

- **Spanish**:
  - Verses read as neutral dropped from **60% to under 2%**.
  - All 40 emotions occur.
  - About 44% of content words carry emotion.
- **English**:
  - Our share of each class correlates positively with the reference
    classifier's scores, from 0.12 for disgust to 0.36 for joy.
  - After standardizing each class, the top class agrees with its label
    about 25% of the time; chance is 17%.

  English is the weaker side. It was labeled from 450 poems instead of 5,000.

## Running it

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r emotion-lab/requirements.txt   # plus the two model wheels listed inside
python emotion-lab/01_lemmatize.py
python emotion-lab/02_build_lexicon.py
node --experimental-strip-types emotion-lab/03_evaluate.ts
node --experimental-strip-types emotion-lab/04_contributors.ts asombro tristeza
```

## Next steps worth doing

- **A small gold set.** Hand-label 200–300 Spanish verses to tune the context
  weights and the neutral threshold (`NEIGHBOUR`, `STANZA`, `POEM`,
  `MIN_CHARGE` in `engine.ts`) against human judgment. The corpus has no
  labels, so these are set by eye for now.
- **Words that change meaning by period.** Some words are read in their
  modern sense even though the Golden Age sense differs (*ilusión* = deceit,
  *cuidado* = grief). A per-period layer could fix this if the app ever knows
  a poem's epoch.
