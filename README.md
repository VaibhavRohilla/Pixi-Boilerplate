# Pixi-Boilerplate

Modern Pixi.js v8 + TypeScript boilerplate with esbuild, hot reload, custom asset pipeline, crisp rendering, and utility UI components.

## Quick start (pnpm)

```bash
# Install
pnpm i

# If you see “Ignored build scripts: esbuild”:
pnpm approve-builds

# Dev (http://localhost:3000 with live reload)
pnpm dev

# Production build (outputs to build/)
pnpm build

# Regenerate assets/manifests only
pnpm assets
```

## Features

- **esbuild** dev + build with a lightweight dev server and WebSocket live reload
- **Custom pipeline** driven by `build.config.json`:
  - viewJsonMerge, copier, assetList, audio sprite (FFmpeg), Pixi manifest generation
- **Crisp visuals**: DPR-aware rendering, autoDensity, roundPixels, DPR-aware text
- **Robust resize**: portrait/landscape handling and DPR changes
- **Colored logger**: INFO/WARN/DANGER/DEBUG with timestamps; production prints info only
- **UI components**: loading bar, animated buttons (texture or graphics) powered by tweedle.js

## Configure pipeline
Edit `build.config.json`. Key fields:
- `buildEntry`, `buildOutput`
- `viewJsonMerge` (merge multiple JSONs to one)
- `copier` (copy files/dirs into build output)
- `assetList` (generate file lists)
- `audio` (generate audiosprite; requires FFmpeg)
- `pixiManifest` (scan built assets to create Pixi bundle manifest)

## Troubleshooting
- pnpm warns “Ignored build scripts: esbuild” → run:
  ```bash
  pnpm approve-builds
  ```
- Audio sprite fails → install FFmpeg and retry; optionally `pnpm dlx audiosprite ...` or install globally.
- Live reload blocked → allow WebSocket port 3001 in your firewall.
- CSS/MIME errors in external servers (e.g., Live Server) → use `pnpm dev` or open `build/index.html` after `pnpm build`.

## Tech
- Pixi.js v8, TypeScript, esbuild, tweedle.js, howler

## License
Private and proprietary.