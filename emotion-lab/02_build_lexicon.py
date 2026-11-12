"""Build the compact lexicons the app ships (lib/emotions/lexicon.{es,en}.json).

Inputs
  lib/emotions/taxonomy.json            the 40 emotions
  lib/emotions/suffix-rules.json        lemma-guessing rules shared with the app
  labels/es/*.tsv                       hand-labeled Spanish lemmas (corpus vocabulary + seeds)
  labels/en/*.tsv                       hand-labeled English lemmas
  data/work/es_lemmas.tsv, es_forms.tsv corpus statistics from 01_lemmatize.py

Steps
  1. merge + validate labels (max weight per emotion, ≤3 emotions per lemma)
  2. propagate labels to rarer corpus lemmas through spaCy word vectors
     (k nearest labeled neighbours; only for lemmas nobody reviewed)
  3. surface forms: keep only the corpus forms whose (emotional) lemma the
     shared suffix rules would miss, so the browser matches spaCy on everything the
     corpus contains while the file stays small
"""
import collections, json, sys
from pathlib import Path

import numpy as np
import pandas as pd
import spacy

HERE = Path(__file__).parent
ROOT = HERE.parent
TAX = json.load(open(ROOT / "lib/emotions/taxonomy.json"))
RULES = json.load(open(ROOT / "lib/emotions/suffix-rules.json"))
EMOS = [e["id"] for e in TAX["emotions"]]
EMO_SET = set(EMOS)
WEIGHTS = {1.0, 0.6, 0.3}

PROP_MIN_FREQ = 2
PROP_K = 8
PROP_MIN_SIM = 0.60
PROP_SCALE = 0.55
PROP_MIN_SUPPORT = 2


def read_labels(paths):
    lex, errors = {}, []
    for p in paths:
        override = p.name.startswith("zz_overrides")
        for ln, line in enumerate(open(p, encoding="utf-8"), 1):
            line = line.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.split("\t")
            lemma = parts[0].strip().lower().split(" ")[0]  # "morir él" → "morir"
            if override:
                lex.pop(lemma, None)
            if len(parts) < 2 or not parts[1].strip():
                continue  # unlabeled = neutral (or removed, in the overrides file)
            for item in parts[1].split(","):
                item = item.strip()
                if not item:
                    continue
                try:
                    emo, w = item.rsplit(":", 1)
                    w = float(w)
                except ValueError:
                    errors.append(f"{p.name}:{ln} bad item {item!r}"); continue
                emo = emo.strip()
                if emo not in EMO_SET:
                    errors.append(f"{p.name}:{ln} unknown emotion {emo!r}"); continue
                w = min(WEIGHTS, key=lambda x: abs(x - w))
                lex.setdefault(lemma, {})
                lex[lemma][emo] = max(lex[lemma].get(emo, 0), w)
    for lemma, d in lex.items():
        if len(d) > 3:
            lex[lemma] = dict(sorted(d.items(), key=lambda kv: -kv[1])[:3])
    return lex, errors


def reviewed_lemmas(chunk_glob):
    out = set()
    for p in (HERE / "data/work/label").glob(chunk_glob):
        for line in open(p, encoding="utf-8"):
            out.add(line.split("\t")[0].lower())
    return out


def propagate(lex, candidates, nlp):
    labeled = [w for w in lex if nlp.vocab.has_vector(w)]
    M = np.stack([nlp.vocab.get_vector(w) for w in labeled]).astype(np.float32)
    M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
    L = np.zeros((len(labeled), len(EMOS)), np.float32)
    for i, w in enumerate(labeled):
        for e, x in lex[w].items():
            L[i, EMOS.index(e)] = x
    added = {}
    cands = [w for w in candidates if nlp.vocab.has_vector(w)]
    for start in range(0, len(cands), 2048):
        batch = cands[start:start + 2048]
        V = np.stack([nlp.vocab.get_vector(w) for w in batch]).astype(np.float32)
        V /= np.linalg.norm(V, axis=1, keepdims=True) + 1e-9
        S = V @ M.T
        top = np.argpartition(-S, PROP_K, axis=1)[:, :PROP_K]
        for r, w in enumerate(batch):
            sims = S[r, top[r]]
            keep = sims >= PROP_MIN_SIM
            if keep.sum() < 2:
                continue
            idx, s = top[r][keep], sims[keep]
            score = (L[idx] * s[:, None]).sum(0) / s.sum() * PROP_SCALE * float(s.max())
            support = (L[idx] > 0).sum(0)  # neighbours that agree on each emotion
            best = np.argsort(-score)[:2]
            d = {}
            for b in best:
                if support[b] < PROP_MIN_SUPPORT:
                    continue
                if score[b] >= 0.45: d[EMOS[b]] = 0.6
                elif score[b] >= 0.17: d[EMOS[b]] = 0.3
            if d:
                added[w] = d
    return added


def guess(form, lemma_set, rules, min_stem):
    if form in lemma_set:
        return form
    for suf, rep in rules:
        if len(form) - len(suf) >= min_stem and form.endswith(suf):
            c = form[: len(form) - len(suf)] + rep
            if c in lemma_set:
                return c
    return None


def build_forms(lex, forms_df, rules):
    lemma_set = set(lex)
    best = forms_df.sort_values("freq", ascending=False).drop_duplicates("form")
    out = {}
    for form, lemma in zip(best.form, best.lemma):
        form, lemma = str(form).lower(), str(lemma).lower()
        lemma = lemma.split(" ")[0]  # "morir él" → "morir"
        if lemma not in lemma_set:
            # spaCy's lemma carries no emotion (or is a lemmatizer slip such as
            # "llora" → NOUN "llora"); let the suffix rules have their say.
            continue
        if guess(form, lemma_set, rules, RULES["minStem"]) != lemma:
            out[form] = lemma
    return out


def compact(lex):
    return {
        w: [x for e, v in sorted(d.items(), key=lambda kv: -kv[1]) for x in (EMOS.index(e), int(round(v * 10)))]
        for w, d in sorted(lex.items())
    }


# spaCy's stop words minus those that carry emotion in poetry. The engine skips
# stop words before any lookup, so "para" never becomes "parir" through the
# suffix rules, nor "una" → "unir".
STOP_KEEP = {"breve", "claro", "contigo", "día", "fin", "nada", "nadie", "nuevo", "partir", "pasado",
             "pesar", "solas", "solo", "tarde", "tuyo", "último", "quizás", "quizá", "lejos", "siempre",
             "alone", "never", "nothing", "nobody", "empty", "last", "alas"}


def stopwords(lang):
    if lang == "es":
        from spacy.lang.es.stop_words import STOP_WORDS
    else:
        from spacy.lang.en.stop_words import STOP_WORDS
    return sorted(w for w in STOP_WORDS if w not in STOP_KEEP)


def write(lang, lex, forms):
    path = ROOT / f"lib/emotions/lexicon.{lang}.json"
    stops = stopwords(lang)
    lex = {w: d for w, d in lex.items() if w not in stops}
    forms = {f: l for f, l in forms.items() if f not in stops}
    data = {"lang": lang, "emotions": EMOS, "stopwords": stops, "lemmas": compact(lex), "forms": dict(sorted(forms.items()))}
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"{path.relative_to(ROOT)}: {len(lex)} lemmas, {len(forms)} forms, {path.stat().st_size/1024:.0f} KB")


def english_forms():
    nlp = spacy.load("en_core_web_lg", disable=["ner", "parser"])
    en = pd.read_csv(HERE / "data/raw/poems_en_emotions.csv")
    c = collections.Counter()
    for doc in nlp.pipe(en["poem content"].astype(str), batch_size=32):
        for t in doc:
            if t.is_alpha:
                c[(t.text.lower(), t.lemma_.lower())] += 1
    return pd.DataFrame([(f, l, n) for (f, l), n in c.items()], columns=["form", "lemma", "freq"])


def main():
    # Spanish
    es, err = read_labels(sorted((HERE / "labels/es").glob("*.tsv")))
    print(f"es labeled: {len(es)} lemmas; {len(err)} errors", *err[:20], sep="\n  ")
    lemmas = pd.read_csv(HERE / "data/work/es_lemmas.tsv", sep="\t", keep_default_na=False)
    reviewed = reviewed_lemmas("es_chunk?.tsv")
    cands = [
        w for w, p, f in zip(lemmas.lemma, lemmas.pos, lemmas.freq)
        # adverbs are left out: vectors confuse "afortunadamente" with its antonyms
        if f >= PROP_MIN_FREQ and p not in ("PROPN", "ADV") and not w.endswith("mente") and len(w) > 2 and w.isalpha() and w not in reviewed and w not in es
    ]
    nlp = spacy.load("es_core_news_lg", disable=["ner", "parser", "tagger", "morphologizer", "lemmatizer", "attribute_ruler"])
    added = propagate(es, cands, nlp)
    print(f"es propagated: {len(added)} of {len(cands)} candidates")
    (HERE / "data/work/es_propagated.tsv").write_text(
        "".join(f"{w}\t{','.join(f'{e}:{v}' for e, v in d.items())}\n" for w, d in sorted(added.items())), encoding="utf-8")
    es_all = {**added, **es}
    forms = build_forms(es_all, pd.read_csv(HERE / "data/work/es_forms.tsv", sep="\t", keep_default_na=False), RULES["es"])
    write("es", es_all, forms)

    # English
    en, err = read_labels(sorted((HERE / "labels/en").glob("*.tsv")))
    print(f"en labeled: {len(en)} lemmas; {len(err)} errors", *err[:20], sep="\n  ")
    write("en", en, build_forms(en, english_forms(), RULES["en"]))


if __name__ == "__main__":
    sys.exit(main())
