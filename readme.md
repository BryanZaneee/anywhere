# Anyplace

A minimalist freeform note-taking application with an infinite canvas. Click anywhere to create notes with rich formatting, smart alignment guides, and multi-document management.

**Built with TypeScript, no frameworks** - Pure vanilla JavaScript with modern features.

## Features

- **Infinite Canvas** - Click anywhere to create notes
- **Smart Alignment** - Photoshop-style alignment guides with 4px snap threshold (hold Alt to disable)
- **Move & Resize Tool** - Drag notes and resize with precision handles
- **Layers Panel** - Visual layer management with drag-to-reorder and show/hide
- **Rich Text Formatting** - Bold, italic, underline, strikethrough, lists, font control
- **Multi-Selection** - Select and edit multiple notes simultaneously
- **Document Management** - Multiple documents with search, pinning, and organization
- **Undo/Redo** - Full history for all operations (Cmd/Ctrl+Z)
- **Copy/Paste/Duplicate** - Duplicate notes or move between documents
- **Light/Dark Theme** - Toggle between themes with persistent preference
- **Auto-Save** - Changes saved automatically to localStorage (debounced for performance)
- **Keyboard Shortcuts** - Extensive keyboard support for power users

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/anyplace.git
cd anyplace

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm start

# Open in browser
# Navigate to http://localhost:8080/src/index.html
```

### Development Mode

```bash
# Run TypeScript compiler in watch mode + dev server
npm run dev

# Or manually:
npm run watch  # Auto-recompile TypeScript on changes
npm start      # Start server (separate terminal)
```

## Keyboard Shortcuts

### Navigation & Selection
- `Escape` - Clear selection
- `⌘/Ctrl + A` - Select all notes
- `Delete/Backspace` - Delete selected notes
- `Arrow Keys` - Move notes (1px)
- `Shift + Arrows` - Move notes (10px)

### Document Management
- `⌘/Ctrl + N` - New document
- `⌘/Ctrl + S` - Save document

### Edit Operations
- `⌘/Ctrl + Z` - Undo
- `⌘/Ctrl + Shift + Z` - Redo
- `⌘/Ctrl + C` - Copy notes
- `⌘/Ctrl + V` - Paste notes
- `⌘/Ctrl + D` - Duplicate notes

### Text Formatting
- `⌘/Ctrl + B` - Bold
- `⌘/Ctrl + I` - Italic
- `⌘/Ctrl + U` - Underline
- `⌘/Ctrl + E` - Center align
- `⌘/Ctrl + L` - Left align
- `⌘/Ctrl + R` - Right align
- `⌘/Ctrl + Shift + 8` - Bullet list
- `⌘/Ctrl + Shift + 7` - Numbered list
- `⌘/Ctrl + +/-` - Font size

## Usage

### Creating Notes
Click anywhere on the canvas to create a note. Type to add content.

### Move Tool
Click the hand icon in the toolbar to enable move mode. Drag notes, resize with handles, and use smart alignment guides that appear when edges align.

### Selection
- Drag on empty canvas to create selection box
- Shift+click to add/remove notes from selection
- Format multiple notes at once

### Layers Panel
View all notes in z-order. Drag to reorder layers, click eye icon to show/hide, or click name to select.

### Documents
Use the sidebar to create, search, pin, and organize multiple documents. Changes save automatically.

## Architecture

Anyplace is built with vanilla TypeScript, HTML, and CSS - **no frameworks or dependencies** (except dev tools). This keeps the bundle small and the codebase accessible.

### Tech Stack

- **TypeScript** - Type safety and better developer experience
- **Vanilla DOM** - Direct DOM manipulation, no virtual DOM
- **localStorage** - Client-side persistence (auto-saves with debouncing)
- **Canvas API** - Smart alignment guides rendering
- **CSS Variables** - Dynamic theming support

### Project Structure

```
src/
├── index.html      # Main HTML structure and UI
├── app.ts          # Core application logic (~2400 lines)
├── alignment.ts    # Smart alignment system (~280 lines)
└── styles.css      # Complete styling including themes
```

### Key Systems

- **Document Management**: Multi-document support with localStorage persistence
- **Alignment System**: Photoshop-style snap guides with 4px threshold
- **Layers System**: Z-index management with drag-to-reorder
- **History System**: Undo/redo with 50-state limit
- **Auto-Save**: Debounced saves (300ms) for frequent operations, immediate saves for critical actions

## Development

### Available Scripts

- `npm run build` - Compile TypeScript to `/dist`
- `npm run watch` - Auto-recompile on file changes
- `npm run typecheck` - Type check without emitting files
- `npm start` - Start development server on port 8080
- `npm run dev` - Run watch + server concurrently

### Type Checking

The project uses strict TypeScript settings including:
- `noUnusedLocals` and `noUnusedParameters` enabled
- `noEmitOnError` - Build fails on type errors
- `strict` mode enabled

Run type checking: `npm run typecheck`

## Roadmap & Open Issues

We welcome contributions! Here are some areas that need work:

### Known Issues

1. **Alignment grid too sticky** (Bug - Medium difficulty)
   - Current snap threshold (4px) feels too aggressive during drag operations
   - Suggestion: Reduce to 2px or make user-configurable in settings
   - Files: `src/alignment.ts` (line 28), `src/app.ts` (SNAP_THRESHOLD constant)

### Features Needed

2. **Group selection movement** (Bug/Feature - Medium difficulty)
   - **BROKEN**: Multiple selected notes cannot be moved together as a group
   - Current state: Selection works, but dragging doesn't move all notes simultaneously
   - Expected: When multiple notes are selected, dragging one should move all of them
   - Files: `src/app.ts` (selection and drag handlers around lines 1850-1930)

3. **Expanded font library** (Enhancement - Easy difficulty)
   - Add popular web fonts: Roboto, Open Sans, Lato, Poppins, Montserrat, etc.
   - Current: 18 font options available
   - Files: `src/index.html` (toolbar font dropdown), `src/app.ts` (FontFamily type definition)

4. **More font size options** (Enhancement - Easy difficulty)
   - Add intermediate sizes: 10px, 11px, 13px, 15px, 17px, 19px, 22px, 26px, etc.
   - Current: Limited granularity between 8-72px range
   - Files: `src/app.ts` (font size controls and constants)

5. **Shape insertion tool** (Feature - Hard difficulty)
   - Add geometric shapes: circles, squares, rectangles, triangles, lines
   - Shapes should be draggable, resizable, and layer-managed like notes
   - Stretch goal: Arrow connectors between notes/shapes
   - Would require: New tool in toolbar, shape rendering system, shape data structure
   - Files: `src/app.ts` (tool system), `src/index.html` (toolbar), `src/styles.css`, possibly new `shapes.ts` module

### Good First Issues

New contributors should start with **#3 (fonts)** or **#4 (font sizes)** - both are straightforward additions that don't require understanding the full architecture.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to submit pull requests, report bugs, and suggest features.

## License

MIT - See [LICENSE](LICENSE) file for details