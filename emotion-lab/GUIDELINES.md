# Emotion lexicon — labeling guidelines

We are building an emotion lexicon for **Spanish poetry** (Neruda, Góngora, Lorca,
Benedetti, Mistral, Darío, Lope…). A verse is scored by summing the emotion weights
of its words, so the lexicon has to capture not only explicit emotion words but the
**emotional connotation that imagery carries in the Spanish lyric tradition**.

The taxonomy (40 emotions, 9 families) is in `lib/emotions/taxonomy.json`. Read the
`desc` of every emotion before labeling. Emotion ids must be written exactly as
there, with accents: `alegría júbilo gozo serenidad gratitud amor deseo ternura
devoción celos optimismo esperanza anhelo asombro misterio éxtasis tristeza
melancolía soledad nostalgia duelo desolación miedo angustia inseguridad desamparo
furia frustración rencor indignación desprecio asco hastío desengaño deber honor
orgullo culpa vergüenza resignación`.

## Output format

One line per word that carries emotion, tab-separated:

```
lemma<TAB>emotion:weight[,emotion:weight]
```

- **Omit** words that are emotionally neutral (most function-like verbs, adverbs,
  numbers, generic nouns: `hacer`, `cosa`, `vez`, `aquí`, `mesa`…). Do not write
  them with an empty label; just leave them out.
- At most **2** emotions per word (3 only if truly necessary).
- Weights, only these values:
  - `1.0` explicit, denotative emotion word: `llanto`→tristeza, `terror`→miedo,
    `besar`→deseo, `luto`→duelo, `odio`→rencor.
  - `0.6` strong conventional connotation in poetry: `ceniza`→duelo,
    `tumba`→duelo, `otoño`→melancolía, `alba`→esperanza, `cadena`→frustración,
    `labio`→deseo, `ayer`→nostalgia, `abismo`→angustia/desolación.
  - `0.3` mild but real tendency: `noche`→misterio, `sombra`→melancolía,
    `mar`→anhelo, `flor`→ternura, `sol`→alegría, `sangre`→furia/duelo,
    `piedra`→desolación, `luna`→misterio/melancolía.
- Keep the lemma exactly as given (same spelling).
- Lemmatizer errors or junk (`dél`, `ó`, fragments, English words in the Spanish
  list): omit.
- Polysemy: label the dominant poetic sense. When a word is ambiguous between
  opposite feelings (`llama` = flame/passion), pick the reading most frequent in
  love/lyric poetry, at a lower weight.
- Adverbs and intensifiers (`tanto`, `muy`) and negators (`no`, `nunca`) are
  handled by the scorer — omit them. Exception: adverbs that are themselves
  emotional (`tristemente`, `dulcemente`, `jamás` is a negator → omit).
- Interjections: `ay`→tristeza:0.6, `oh`→asombro:0.3, etc.
- Be generous with connotation (that is the point — the old system left almost
  every verse "neutral"), but never assign an emotion that a reader of Spanish
  poetry would find wrong.

## Example

```
amor	amor:1.0
noche	misterio:0.3,melancolía:0.3
muerte	duelo:1.0
sombra	melancolía:0.3,miedo:0.3
dulce	ternura:0.6,gozo:0.3
alba	esperanza:0.6,optimismo:0.3
llorar	tristeza:1.0
herida	tristeza:0.6,duelo:0.3
cielo	asombro:0.3,devoción:0.3
nunca
```
(the last line is wrong — negators are omitted entirely.)
