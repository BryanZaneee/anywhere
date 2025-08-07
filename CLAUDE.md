# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anywhere** is a freeform note-taking application built with TypeScript, HTML, and CSS. It provides an infinite canvas where users can click anywhere to create text notes with rich formatting options.

## Architecture

### Core Components

- **Canvas System**: The main infinite workspace where notes are positioned absolutely
- **Note Management**: Each note is a contentEditable div with persistent styling and positioning
- **Document System**: Multiple documents/pages with save/load functionality via localStorage
- **State Management**: Global state variables track current note, document, and UI state

### Key Modules

- **Document Management** (`loadDocuments`, `saveDocuments`, `createNewDocument`): Handles multiple note documents with localStorage persistence
- **Note Operations** (`setupNote`, `applyStyles`, `updateStyles`): Individual note creation, editing, and formatting
- **Selection System** (`updateSelection`, selection box): Multi-note selection with group operations
- **Toolbar System**: Floating formatting toolbar with drag functionality
- **Sidebar System**: Collapsible sidebar with document browser, search, and theme toggle

### Data Structure

```typescript
interface Document {
  id: string;
  title: string;
  notes: NoteData[];
  pinned: boolean;
  hasCustomTitle?: boolean;
}

interface NoteData {
  x: number;
  y: number;
  text: string;
  html: string;
  styles: NoteStyles;
}

interface NoteStyles {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontSize: string;
  fontFamily: string;
  align: 'left' | 'center' | 'right';
  listType: 'none' | 'bullet' | 'numbered';
}
```

## Development Commands

The project now uses TypeScript for enhanced type safety and developer experience:

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `/dist` folder
- **Watch Mode**: `npm run watch` - Automatically recompile TypeScript on changes
- **Development**: Open `src/index.html` in a browser (references compiled JS from `/dist`)
- **Local Server**: `npm run serve` - Serves application on localhost:8080
- **Testing**: Manual testing in browser - no automated test suite yet

## Key Features

- **Infinite Canvas**: Click anywhere to create a note
- **Rich Text Formatting**: Bold, italic, underline, strikethrough, font size/family, alignment
- **Multi-selection**: Shift+click or drag selection box for group operations
- **Document Management**: Multiple documents with search, pinning, and organization
- **Persistence**: All data saved to localStorage automatically
- **Theme System**: Light/dark mode toggle
- **Responsive Sidebar**: Collapsible document browser
- **Keyboard Shortcuts**: Standard text formatting shortcuts (Ctrl/Cmd+B, I, U, etc.)

## File Structure

```
src/
├── index.html     # Main application structure and UI
├── app.ts         # Core application logic and interactions (TypeScript)
├── types.ts       # TypeScript type definitions
└── styles.css     # Complete styling including dark theme
dist/
├── app.js         # Compiled JavaScript (generated)
├── app.js.map     # Source map for debugging
├── types.js       # Compiled type definitions
└── types.js.map   # Source map for types
```

## State Management Patterns

- **Global Variables**: All state managed through typed global variables at top of app.ts
- **Event-Driven**: Heavy use of DOM event listeners for interactions
- **Auto-Save**: Document changes trigger automatic localStorage updates
- **Theme Persistence**: Theme preference saved to localStorage
- **Type Safety**: All data structures and functions are fully typed for better reliability

## UI Interaction Patterns

- **Canvas Click**: Creates new note at click position
- **Note Focus**: Shows formatting toolbar
- **Toolbar Dragging**: Toolbar can be repositioned by dragging
- **Selection Box**: Drag on empty canvas to select multiple notes
- **Group Operations**: Selected notes can be moved and formatted together