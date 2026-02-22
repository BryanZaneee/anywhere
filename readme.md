# Anyplace

Minimal spatial note-taking app. Click anywhere to write. No runtime dependencies.

## Quick Start

Open `index.html` in a browser.

Or serve locally:

```bash
python3 -m http.server 8080
```

## Features

- Click canvas to create notes
- Drag notes to reposition
- Cmd/Ctrl+B and Cmd/Ctrl+I formatting
- Multiple documents with sidebar navigation
- Search documents
- Dark/light theme toggle
- Auto-save to localStorage

## Build and Size Checks

Create a single-file production build:

```bash
node scripts/build.mjs
```

Run size budget checks (`raw <= 10000`, `gzip <= 3500` for core files):

```bash
node scripts/size-check.mjs
```

## Storage

- Current schema: `localStorage["anywhere"]` (compact v2 arrays)
- Legacy keys (`anywhereDocuments`, `darkMode`) are migrated automatically

## License

MIT
