# Poem Visualizer

A Next.js app for visualizing poems. This is the original Perpetuo project and currently lives at the root of this repository.

## Structure

- `app/` — Next.js app router pages and global styles
- `components/` — UI components (`PoemInput`, `PoemVisualizer`, `PoemLegend`, `ModeSelector`)
- `lib/` — poem parsing logic (`poemParser.ts`)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Deployment

Deployed via Vercel (see `vercel.json`).
