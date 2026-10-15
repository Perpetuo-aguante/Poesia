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
from rantanplan.pipeline import load_pipeline

MAX_CHARS = 20000

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
    # Cargar spaCy tarda ~30 s; mejor pagarlo al arrancar que en la primera petición.
    load_pipeline()
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
