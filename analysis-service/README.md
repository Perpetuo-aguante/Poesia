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
El `Dockerfile` usa `python:3.8-slim` y descarga el modelo de spaCy al construir
la imagen.

## Modo ligero (por defecto)

La configuración completa de Rantanplan ocupa ~1.4 GB de RAM: el modelo
mediano de spaCy (`es_core_news_md`) y el separador de enclíticos de
spacy-affixes. Por defecto el servicio usa el modelo pequeño
(`es_core_news_sm`) y apaga el separador, y queda en **~250 MB**, con arranque de
unos segundos. En los poemas de prueba (soneto de Quevedo, romance de Lorca,
Bécquer, Neruda, Sor Juana y versos con enclíticos como «dímelo», «quiérote»,
«llévame») la escansión salió **idéntica** a la completa.

Para la configuración completa en una máquina con más memoria:

```bash
docker build --build-arg FULL=1 -t perpetuo-rantanplan .
docker run -p 7860:7860 -e RANTANPLAN_MODEL=es_core_news_md -e RANTANPLAN_SPLIT_AFFIXES=1 perpetuo-rantanplan
```

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

## Publicarlo gratis en Render

Hugging Face Spaces ya solo permite Spaces estáticos en el plan gratuito
(Docker y Gradio son de pago), así que no sirve para este servicio.
Render sí tiene un plan gratuito con Docker (512 MB de RAM):

1. Entra a [render.com](https://render.com) con tu cuenta de GitHub.
2. **New → Web Service** → elige el repositorio `Perpetuo-aguante/Poesia`.
3. Configura:
   - **Branch**: `main` (o la rama del PR si aún no está fusionado)
   - **Root Directory**: `analysis-service`
   - **Language / Runtime**: `Docker` (Render lo detecta por el `Dockerfile`)
   - **Instance Type**: `Free`
   - En *Advanced*, **Health Check Path**: `/health`
   - No hace falta ninguna variable de entorno.
4. Cuando termine el primer deploy, copia la URL del servicio
   (algo como `https://perpetuo-rantanplan.onrender.com`). Puedes comprobarla
   abriendo `…/health`, que debe responder `{"ok":true}`.
5. En Vercel → el proyecto → **Settings → Environment Variables**, agrega
   `RANTANPLAN_URL` con esa URL (sin `/scan` al final) y vuelve a desplegar.

(El `render.yaml` de la raíz describe lo mismo para quien use Blueprints;
no es necesario para el paso manual.)

El plan gratuito duerme el servicio tras 15 minutos sin visitas; despertar
tarda alrededor de un minuto. La app hace un «ping» al servicio en cuanto se
abre la página, para que esté despierto cuando alguien pegue un poema; si aun
así no responde a tiempo, la app usa su análisis local.

## Límites conocidos

- Solo español. Los poemas en inglés siguen usando el analizador local.
- La rima de Rantanplan a veces no detecta la asonancia del romance; en ese caso
  la app conserva la rima detectada localmente.
