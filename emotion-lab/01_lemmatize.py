"""Lemmatize the Spanish poetry corpus and count content lemmas + surface forms.

Input : data/raw/poems_es.csv  (author, content, title)
Output: data/work/es_lemmas.tsv   lemma, pos, freq, n_poems
        data/work/es_forms.tsv    form, lemma, freq
        data/work/es_verses.jsonl one record per verse (poem_id, text) for evaluation
"""
import collections, json, sys
from pathlib import Path
import pandas as pd
import spacy

HERE = Path(__file__).parent
CONTENT_POS = {"NOUN", "VERB", "ADJ", "ADV", "PROPN", "INTJ"}

def main():
    df = pd.read_csv(HERE / "data/raw/poems_es.csv").dropna(subset=["content"])
    nlp = spacy.load("es_core_news_lg", disable=["ner", "parser"])
    lemma_freq = collections.Counter(); lemma_pos = collections.defaultdict(collections.Counter)
    lemma_docs = collections.Counter(); form_lemma = collections.Counter()
    verses_out = open(HERE / "data/work/es_verses.jsonl", "w")
    texts = []
    for pid, content in enumerate(df["content"]):
        lines = [l.strip() for l in str(content).splitlines() if l.strip()]
        for l in lines:
            verses_out.write(json.dumps({"poem": pid, "text": l}, ensure_ascii=False) + "\n")
        texts.append((" \n".join(lines), pid))
    for doc, pid in nlp.pipe(texts, as_tuples=True, batch_size=64, n_process=4):
        seen = set()
        for t in doc:
            if not t.is_alpha or t.pos_ not in CONTENT_POS:
                continue
            lem = t.lemma_.lower(); form = t.text.lower()
            lemma_freq[lem] += 1; lemma_pos[lem][t.pos_] += 1; form_lemma[(form, lem)] += 1
            seen.add(lem)
        for lem in seen:
            lemma_docs[lem] += 1
        if pid % 500 == 0:
            print(pid, file=sys.stderr)
    with open(HERE / "data/work/es_lemmas.tsv", "w") as f:
        f.write("lemma\tpos\tfreq\tn_poems\n")
        for lem, n in lemma_freq.most_common():
            f.write(f"{lem}\t{lemma_pos[lem].most_common(1)[0][0]}\t{n}\t{lemma_docs[lem]}\n")
    with open(HERE / "data/work/es_forms.tsv", "w") as f:
        f.write("form\tlemma\tfreq\n")
        for (form, lem), n in form_lemma.most_common():
            f.write(f"{form}\t{lem}\t{n}\n")

if __name__ == "__main__":
    main()
