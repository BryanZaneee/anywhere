# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anyplace** is a minimal freeform spatial note-taking app. Vanilla HTML/CSS/JS — no build step, no dependencies. Open `index.html` to run.

## File Structure

```
index.html   # Markup (~40 lines)
style.css    # Styles with light/dark CSS variables (~150 lines)
app.js       # All logic in an IIFE (~250 lines)
```

## Data

- localStorage key `anywhereDocuments` — object of `{ id, title, notes: [{ x, y, html }] }`
- Theme stored in `darkMode` key

## Key Features

- Click canvas to create a contentEditable note at cursor position
- Drag notes to move (5px dead zone distinguishes click from drag)
- Cmd/Ctrl+B and Cmd/Ctrl+I for bold/italic (browser execCommand)
- Sidebar: document list, search, new document, theme toggle, collapse
- Auto-save (300ms debounce) to localStorage
- Auto-title from first note's text
- Empty notes removed on blur
- Dark/light theme via `body.dark` class and CSS variables
- Basic touch support (touch events mapped to mouse events)

## Development

No build step. Edit files and refresh browser. Serve locally with any static server:

```bash
python3 -m http.server 8080
```
