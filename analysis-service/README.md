# Servicio de escansión (Rantanplan)

Pequeño servicio en Python que analiza la métrica de poemas en español con
[Rantanplan](https://pypi.org/project/rantanplan/) (proyecto POSTDATA, UNED).
La app de Next.js lo usa para mejorar el conteo silábico, el patrón acentual
y la rima; si no está disponible, la app sigue funcionando con su analizador local.

## Qué devuelve

`POST /scan` con `{ "text": "…poema…" }` responde:

```json
{
  "engine": "rantanplan",
  "structure": "cuarteto",
  "verses": [
    { "text": "Cerrar podrá mis ojos la postrera",
      "syllables": 11, "stress": "-+-+-+---+-",
      "rhyme": "a", "ending": "era", "rhymeType": "consonant" }
  ]
}
```

`GET /health` responde `{ "ok": true }`.

## Por qué Python 3.8

Rantanplan fija `spacy==2.2.4`, que no se instala en versiones nuevas de Python.
El `Dockerfile` usa `python:3.8-slim` y descarga los modelos (`es_core_news_md`
y los afijos de spacy-affixes) al construir la imagen. La primera carga del
modelo tarda ~30 s; el servicio la hace al arrancar, y después cada poema tarda
centésimas de segundo.

## Correrlo en local

```bash
cd analysis-service
docker build -t perpetuo-rantanplan .
docker run -p 7860:7860 perpetuo-rantanplan
```

Y en la app:

```bash
RANTANPLAN_URL=http://localhost:7860 npm run dev
```

## Publicarlo

Cualquier servicio que corra un Dockerfile sirve:

- **Hugging Face Spaces** (gratis): crea un Space de tipo *Docker* y sube
  `app.py`, `requirements.txt` y `Dockerfile`. El puerto 7860 ya está configurado.
- **Render / Railway**: apunta al directorio `analysis-service/`; ellos pasan `$PORT`.

Después, en Vercel, define la variable de entorno `RANTANPLAN_URL` con la URL
del servicio (sin `/scan` al final). Opcionalmente, limita quién puede llamarlo
con `ALLOWED_ORIGINS` (lista separada por comas).

## Límites conocidos

- Solo español. Los poemas en inglés siguen usando el analizador local.
- La rima de Rantanplan a veces no detecta la asonancia del romance; en ese caso
  la app conserva la rima detectada localmente.
