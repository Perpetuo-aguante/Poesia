"""
Perpetuo — servicio de escansión con Rantanplan.

Recibe el texto de un poema y devuelve, verso por verso, la medida métrica,
el patrón acentual y la rima según Rantanplan (POSTDATA / UNED).
La app de Next.js lo llama desde /api/analyze; si el servicio no responde,
la app sigue usando su analizador local.
"""

import os
import re
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rantanplan import get_scansion
from rantanplan import pipeline

MAX_CHARS = 20000

# Light mode by default so the service fits in 512 MB (Render's free tier):
#   · es_core_news_sm instead of _md (~250 MB less)
#   · no spacy-affixes enclitic splitter (~700 MB less)
# On test poems (sonnets, romances, décimas, enclitics like "dímelo",
# "quiérote") the scansion was identical. Set RANTANPLAN_MODEL=es_core_news_md
# and RANTANPLAN_SPLIT_AFFIXES=1 on a larger machine for the full pipeline.
MODEL = os.environ.get("RANTANPLAN_MODEL", "es_core_news_sm")
SPLIT_AFFIXES = os.environ.get("RANTANPLAN_SPLIT_AFFIXES", "0") == "1"

app = FastAPI(title="Perpetuo · Rantanplan")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    text: str


class ScannedVerse(BaseModel):
    text: str
    syllables: int          # medida métrica (con sinalefas y ley del acento final)
    stress: str             # patrón acentual, p. ej. "-+-+-+---+-"
    rhyme: Optional[str]    # letra del esquema de rima ("a", "b"…) o None
    ending: Optional[str]   # terminación que rima
    rhymeType: Optional[str]  # "consonant" | "assonant"


class ScanResponse(BaseModel):
    engine: str
    structure: Optional[str]
    verses: List[ScannedVerse]


@app.on_event("startup")
def warm_up() -> None:
    if not SPLIT_AFFIXES:
        # Rantanplan reads these token attributes even when the splitter is off.
        from spacy.tokens import Token
        for name, default in [("has_affixes", False), ("affixes_kind", None),
                              ("affixes_lemma", None), ("affixes_length", 0),
                              ("affixes_rule", None), ("affixes_text", None)]:
            if not Token.has_extension(name):
                Token.set_extension(name, default=default)
    # get_scansion always asks for the default (md) pipeline; point it at ours.
    nlp = pipeline.load_pipeline(MODEL, split_affixes=SPLIT_AFFIXES)
    pipeline._load_pipeline["es_core_news_md"] = nlp
    # Loading spaCy takes a while; pay it at startup, not on the first poem.
    get_scansion("Verde que te quiero verde.")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/scan", response_model=ScanResponse)
def scan(req: ScanRequest) -> ScanResponse:
    text = req.text[:MAX_CHARS]
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return ScanResponse(engine="rantanplan", structure=None, verses=[])

    # Rantanplan ignora los saltos de estrofa; analizamos el poema completo
    # para que la rima se detecte entre estrofas (p. ej. en un soneto).
    result = get_scansion("\n".join(lines), rhyme_analysis=True,
                          always_return_rhyme=True)

    verses = []
    for line, item in zip(lines, result):
        rhythm = item.get("rhythm", {})
        rhyme = item.get("rhyme")
        verses.append(ScannedVerse(
            text=line,
            syllables=int(rhythm.get("length", 0)),
            stress=rhythm.get("stress", ""),
            rhyme=rhyme if rhyme and re.match(r"^[a-zA-Z]+$", rhyme) else None,
            ending=item.get("ending") or None,
            rhymeType=item.get("rhyme_type") or None,
        ))

    structure = result[0].get("structure") if result else None
    if structure == "unknown":
        structure = None
    return ScanResponse(engine="rantanplan", structure=structure, verses=verses)
