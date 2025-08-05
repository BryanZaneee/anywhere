# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anywhere** is a freeform note-taking application built with vanilla HTML, CSS, and JavaScript. It provides an infinite canvas where users can click anywhere to create text notes with rich formatting options.

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

```javascript
documents = {
  [id]: {
    id: string,
    title: string,
    notes: [
      {
        x: number,
        y: number, 
        text: string,
        html: string,
        styles: {
          bold: boolean,
          italic: boolean,
          underline: boolean,
          strike: boolean,
          fontSize: string,
          fontFamily: string,
          align: 'left'|'center'|'right'
        }
      }
    ],
    pinned: boolean
  }
}
```

## Development Commands

Since this is a client-side only application with no build process:

- **Development**: Open `src/index.html` directly in a browser or use a local server
- **Testing**: Manual testing in browser - no automated test suite
- **No package.json**: Pure vanilla web technologies, no dependencies or build tools

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
├── app.js         # Core application logic and interactions  
└── styles.css     # Complete styling including dark theme
```

## State Management Patterns

- **Global Variables**: All state managed through global variables at top of app.js
- **Event-Driven**: Heavy use of DOM event listeners for interactions
- **Auto-Save**: Document changes trigger automatic localStorage updates
- **Theme Persistence**: Theme preference saved to localStorage

## UI Interaction Patterns

- **Canvas Click**: Creates new note at click position
- **Note Focus**: Shows formatting toolbar
- **Toolbar Dragging**: Toolbar can be repositioned by dragging
- **Selection Box**: Drag on empty canvas to select multiple notes
- **Group Operations**: Selected notes can be moved and formatted together