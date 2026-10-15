# Rantanplan necesita spaCy 2.2.4 → Python 3.8.
FROM python:3.8-slim

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir setuptools wheel "spacy==2.2.4" "spacy-affixes==0.1.4" \
    && pip install --no-cache-dir --no-build-isolation -r requirements.txt \
    && python -m spacy download es_core_news_md \
    && python -c "from spacy_affixes.utils import download; download(lang='es')"

COPY app.py .

# Hugging Face Spaces usa el puerto 7860; Render/Railway pasan $PORT.
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
