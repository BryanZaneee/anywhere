# Anywhere - Freeform Note Taking

A freeform note-taking application that provides an infinite canvas where you can click anywhere to create text notes with rich formatting options.

## Features

- **Infinite Canvas**: Click anywhere to create a note
- **Rich Text Formatting**: Bold, italic, underline, strikethrough, font size/family, alignment
- **Multi-selection**: Select multiple notes for group operations
- **Document Management**: Multiple documents with search, pinning, and organization
- **Undo/Redo Support**: Full undo/redo history for all operations
- **Copy/Paste**: Copy and paste notes within and between documents
- **Theme System**: Light/dark mode toggle
- **Auto-save**: All changes saved automatically to localStorage

## Keyboard Shortcuts

### Selection & Navigation
- **Escape** - Clear current selection
- **Ctrl/Cmd + A** - Select all notes
- **Delete/Backspace** - Delete selected notes
- **Arrow Keys** - Move selected notes (1px increments)
- **Shift + Arrow Keys** - Move selected notes (10px increments)

### Document Management
- **Ctrl/Cmd + N** - Create new document
- **Ctrl/Cmd + S** - Force save current document

### Editing & Formatting
- **Ctrl/Cmd + Z** - Undo last action
- **Ctrl/Cmd + Shift + Z** - Redo last action
- **Ctrl/Cmd + C** - Copy selected notes
- **Ctrl/Cmd + V** - Paste copied notes
- **Ctrl/Cmd + D** - Duplicate selected notes

#### Text Formatting (selected notes or active note)
- **Ctrl/Cmd + B** - Toggle bold
- **Ctrl/Cmd + I** - Toggle italic  
- **Ctrl/Cmd + U** - Toggle underline
- **Ctrl/Cmd + E** - Center align text
- **Ctrl/Cmd + L** - Left align text
- **Ctrl/Cmd + R** - Right align text

#### Font Size (selected notes only)
- **Ctrl/Cmd + Plus/=** - Increase font size
- **Ctrl/Cmd + Minus** - Decrease font size

## Usage

1. **Creating Notes**: Click anywhere on the canvas to create a new note
2. **Selecting Notes**: 
   - Click and drag to select multiple notes with selection box
   - Shift+click to add notes to selection
   - Click on individual notes to select them
3. **Formatting**: Use the toolbar or keyboard shortcuts to format text
4. **Moving Notes**: Drag individual notes or use arrow keys for precise positioning
5. **Documents**: Use the sidebar to manage multiple documents, search, and organize

## Development

This is a pure client-side application built with vanilla HTML, CSS, and JavaScript.

**Development**: Open `src/index.html` directly in a browser or use a local server  
**No Build Process**: No dependencies or build tools required