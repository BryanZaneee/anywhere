# Contributing to Anyplace

Thank you for your interest in contributing to Anyplace! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on GitHub with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Browser and OS information
- Screenshots if applicable

### Suggesting Features

We love feature suggestions! Please open an issue with:
- A clear description of the feature
- The problem it solves
- Any proposed implementation details
- Mockups or examples if applicable

### Pull Requests

1. **Fork the repository** and create your branch from `master`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our code style
4. **Test your changes**: `npm run build` and manually test
5. **Run type checking**: `npm run typecheck`
6. **Commit your changes** with clear, descriptive messages
7. **Push to your fork** and submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/anyplace.git
cd anyplace

# Install dependencies
npm install

# Start development server with auto-rebuild
npm run dev

# Or manually:
npm run build  # Compile TypeScript
npm start      # Start server on localhost:8080
```

## Code Style Guidelines

- **TypeScript**: Use strict typing, avoid `any` where possible
- **Formatting**: 2-space indentation, single quotes for strings
- **Functions**: Add JSDoc comments for complex functions
- **Constants**: Extract magic numbers to named constants
- **Naming**: Use camelCase for variables/functions, PascalCase for types/interfaces

### Example

```typescript
// Good
const SNAP_THRESHOLD = 4; // pixels

function calculateAlignment(note: HTMLDivElement): AlignmentResult {
  // Implementation
}

// Avoid
const threshold = 4;

function calc(n: any) {
  // Implementation
}
```

## Project Structure

```
src/
├── index.html      # Main HTML structure
├── app.ts          # Core application logic
├── alignment.ts    # Smart alignment system
└── styles.css      # All styling
```

## Testing

Currently, Anyplace relies on manual testing. Before submitting a PR, please test:

- Creating, editing, and deleting notes
- Multi-note selection and formatting
- Document management (create, save, load, delete)
- Alignment guides and snapping
- Layers panel (reorder, hide/show)
- Keyboard shortcuts
- Theme switching
- Undo/redo operations

## Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add debouncing to save operations for better performance"
git commit -m "Fix: Persistence bug in loadDocuments()"

# Avoid
git commit -m "fix stuff"
git commit -m "updates"
```

## Questions?

Feel free to open an issue with the `question` label if you have any questions about contributing.

Thank you for helping make Anyplace better!
