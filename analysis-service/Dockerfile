# Rantanplan necesita spaCy 2.2.4 → Python 3.8.
FROM python:3.8-slim

# FULL=1 instala el modelo mediano y los afijos (necesita ~1.5 GB de RAM).
# Por defecto se usa el modo ligero, que cabe en 512 MB.
ARG FULL=0
ENV RANTANPLAN_MODEL=es_core_news_sm \
    RANTANPLAN_SPLIT_AFFIXES=0

WORKDIR /app
COPY requirements.txt .
# spaCy's compiled dependencies are pinned in requirements.txt to versions with
# prebuilt wheels, so no compiler is needed. spaCy must be installed before
# rantanplan, whose setup.py imports it.
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir "cymem==2.0.8" "murmurhash==1.0.10" "preshed==3.0.9" \
         "spacy==2.2.4" "spacy-affixes==0.1.4" \
    && pip install --no-cache-dir --no-build-isolation -r requirements.txt \
    && python -m spacy download es_core_news_sm \
    && if [ "$FULL" = "1" ]; then \
         python -m spacy download es_core_news_md \
         && python -c "from spacy_affixes.utils import download; download(lang='es')"; \
       fi

COPY app.py .

# Render/Railway pasan $PORT; 7860 es el valor por defecto.
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
