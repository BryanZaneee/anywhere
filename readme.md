# Anyplace

Freeform note-taking application with an infinite canvas. Built with vanilla TypeScript — zero frameworks, zero runtime dependencies.

## Quick Start

```bash
git clone https://github.com/BryanZaneee/anywhere.git
cd anywhere
npm install
npm run build
npm start
```

Open http://localhost:8080/src/ in your browser.

Development mode (watch + serve):
```bash
npm run dev
```

## Features

- **Infinite Canvas**: Click anywhere to create notes
- **Rich Text**: Bold, italic, underline, strikethrough, lists, fonts, alignment
- **Smart Alignment**: Snap-to-edge guides with 4px threshold
- **Layers Panel**: Drag-to-reorder, show/hide, automatic updates
- **Multi-Selection**: Select multiple notes for group operations
- **Documents**: Multiple pages with search, pinning, and organization
- **Edit Tools**: Undo/redo, copy/paste, duplicate
- **Themes**: Light/dark mode toggle
- **Persistence**: Auto-save to localStorage

## Architecture

```
src/
├── index.html     # Application entry point
├── app.ts         # Core application logic
├── alignment.ts   # Smart alignment/snapping system
├── types.ts       # TypeScript type definitions
└── styles.css     # Styling including dark theme
dist/              # Compiled JavaScript output
```

State managed via typed global variables. Event-driven DOM interactions. No external dependencies at runtime.

## Contributing

Guidelines in [CONTRIBUTING.md](CONTRIBUTING.md). Issues tracked on [GitHub Issues](https://github.com/BryanZaneee/anywhere/issues).

## License

MIT
