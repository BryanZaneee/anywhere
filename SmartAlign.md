# Smart Align - Implementation Documentation

## Overview

Smart Align is a Photoshop/Figma-style alignment guide system for the Anywhere note-taking application. It provides visual guides and snap-to-align functionality when moving notes, helping users position content precisely with professional-grade alignment assistance.

## Architecture

### Core Components

The Smart Align system consists of three main components:

1. **AlignmentCalculator** - Core logic for calculating alignment guides and snap positions
2. **GuideRenderer** - Canvas-based visual rendering of alignment guides
3. **QuadTree** - Spatial indexing for performance optimization

### File Structure

```
src/
├── alignment.ts          # TypeScript source (excluded from compilation)
├── app.ts               # Integration with main application
└── styles.css           # Visual styling for guides and feedback

dist/
└── alignment.js         # Hand-optimized JavaScript (global script)
```

## Code Flow

### 1. Initialization

```typescript
// System initializes when app loads
guidesCanvas = document.getElementById('alignmentGuides');
alignmentCalculator = new AlignmentCalculator({
  snapThreshold: 8,
  snapEnabled: true,
  guideColors: {
    edge: 'rgba(59, 130, 246, 0.6)',    // Blue for edges
    center: 'rgba(239, 68, 68, 0.6)',   // Red for centers
    spacing: 'rgba(34, 197, 94, 0.6)'   // Green for spacing
  }
});
guideRenderer = new GuideRenderer(guidesCanvas);
```

### 2. Drag Detection

When user enters move mode and starts dragging:

```typescript
// Move tool activation
currentTool = 'move' → note selection → drag start

// Individual note drag
isDraggingNote = true
draggedNote = selectedNote

// Group drag (multiple notes)
isDraggingGroup = true
```

### 3. Bounds Calculation

The system calculates alignment based on selection box boundaries (not individual note elements):

```typescript
// Calculate selection box bounds
let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
selectedNotes.forEach(note => {
  const x = parseInt(note.style.left) + dx;
  const y = parseInt(note.style.top) + dy;
  const w = note.offsetWidth;
  const h = note.offsetHeight;
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  maxX = Math.max(maxX, x + w);
  maxY = Math.max(maxY, y + h);
});

const draggedBounds = {
  left: minX,
  top: minY,
  right: maxX,
  bottom: maxY,
  width: maxX - minX,
  height: maxY - minY,
  centerX: (minX + maxX) / 2,
  centerY: (minY + maxY) / 2
};
```

### 4. Spatial Indexing

The QuadTree provides efficient collision detection for large numbers of notes:

```typescript
// Initialize spatial index
alignmentCalculator.initializeQuadTree({
  x: 0, y: 0,
  width: window.innerWidth * 2,
  height: window.innerHeight * 2
});

// Cache note positions
alignmentCalculator.cacheNoteBounds(allNotes);

// Efficient retrieval of nearby notes
const nearbyNotes = this.quadTree.retrieve(draggedBounds);
```

### 5. Alignment Calculation

The system calculates various types of alignments:

```typescript
calculateAlignments(draggedBounds, excludeIds) {
  // Edge alignments (left, right, top, bottom)
  const leftDiff = Math.abs(draggedBounds.left - targetBounds.left);
  if (leftDiff < threshold) {
    guides.push({
      type: 'vertical',
      position: targetBounds.left,
      strength: 1 - (leftDiff / threshold),
      color: this.options.guideColors.edge
    });
  }
  
  // Center alignments
  const centerXDiff = Math.abs(draggedBounds.centerX - targetBounds.centerX);
  if (centerXDiff < threshold) {
    guides.push({
      type: 'vertical-center',
      position: targetBounds.centerX,
      strength: 1 - (centerXDiff / threshold),
      color: this.options.guideColors.center
    });
  }
}
```

### 6. Snap Position Calculation

```typescript
calculateSnapPosition(draggedBounds, guides) {
  // Find strongest alignments
  const verticalGuides = guides.filter(g => 
    g.type === 'vertical' || g.type === 'vertical-center'
  );
  const horizontalGuides = guides.filter(g => 
    g.type === 'horizontal' || g.type === 'horizontal-center'
  );
  
  // Calculate snap deltas
  let deltaX = 0, deltaY = 0;
  if (verticalGuides.length > 0) {
    const strongest = verticalGuides[0];
    deltaX = strongest.position - draggedBounds.centerX;
  }
  
  return { snapped: true, deltaX, deltaY, guides };
}
```

### 7. Visual Rendering

The GuideRenderer draws guides on a dedicated canvas layer:

```typescript
drawGuidesInternal() {
  this.activeGuides.forEach(guide => {
    // Enhanced visual styling
    this.ctx.strokeStyle = guide.color;
    this.ctx.lineWidth = Math.max(2, guide.strength * 3);
    this.ctx.lineCap = 'round';
    
    // Shadow for contrast
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 1;
    
    // Dashed lines for center guides
    if (guide.type.includes('center')) {
      this.ctx.setLineDash([8, 4]);
    }
    
    // Draw guide line
    if (guide.type.startsWith('vertical')) {
      this.ctx.moveTo(guide.position, 0);
      this.ctx.lineTo(guide.position, this.canvas.height);
    } else {
      this.ctx.moveTo(0, guide.position);
      this.ctx.lineTo(this.canvas.width, guide.position);
    }
    this.ctx.stroke();
    
    // Strong alignment indicators
    if (guide.strength > 0.8) {
      // Draw small circles at edges
    }
  });
}
```

## Performance Optimizations

### 1. Debouncing
```typescript
const alignmentDebounceDelay = 16; // ~60fps
const shouldCalculateAlignment = (currentTime - lastAlignmentTime) >= alignmentDebounceDelay;
```

### 2. Spatial Indexing
- QuadTree reduces O(n²) to O(log n) for collision detection
- Only checks nearby notes instead of all notes

### 3. Early Exit Optimizations
```typescript
if (this.cachedBounds.size === 0) return guides;
if (nearbyNotes.length === 0) return guides;
```

### 4. Cache Optimization
```typescript
// Skip rebuild if notes haven't changed
if (this.cachedBounds.size === notes.length) {
  let hasChanged = false;
  notes.forEach(note => {
    if (!this.cachedBounds.has(note.id)) hasChanged = true;
  });
  if (!hasChanged) return;
}
```

## Visual Feedback System

### 1. Guide Animations
- **Fade In**: 150ms smooth opacity transition when guides appear
- **Fade Out**: 200ms smooth opacity transition when guides disappear
- **Strength-based Styling**: Line thickness based on alignment strength

### 2. Snap Feedback
```css
#alignmentGuides.snap-active {
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
}
```

### 3. Alt Key Override
```css
#alignmentGuides.snap-disabled {
  opacity: 0.3;
  filter: grayscale(100%);
}
```

### 4. Cursor Feedback
```css
#canvas.move-mode.snap-disabled {
  cursor: not-allowed !important;
}
```

## Integration Points

### 1. Move Tool Integration
- Activates only when `currentTool === 'move'`
- Works with both individual and group note selection
- Integrates with existing resize handles system

### 2. Event Handling
```typescript
document.addEventListener('mousemove', e => {
  if (isDraggingNote || isDraggingGroup) {
    // Alignment calculations here
  }
});
```

### 3. Canvas Coordinate System
- Alignment canvas: `position: fixed` overlay
- Note coordinates: `style.left/top` absolute positioning
- Selection boxes: calculated from note bounds

## Configuration

### Default Settings
```typescript
const options = {
  snapThreshold: 8,        // 8px proximity for snapping
  snapEnabled: true,       // Enable snapping by default
  showDistances: false,    // Future: show distance measurements
  guideColors: {
    edge: 'rgba(59, 130, 246, 0.6)',     // Blue
    center: 'rgba(239, 68, 68, 0.6)',    // Red
    spacing: 'rgba(34, 197, 94, 0.6)'    // Green
  }
};
```

### User Controls
- **Snap Toggle Button**: Enable/disable alignment system
- **Alt Key**: Temporarily disable snapping during drag
- **Visual Indicators**: Show snap status in UI

## Debugging

The system includes comprehensive debugging:

```typescript
console.log('Smart Align Debug - System initialized successfully');
console.log('Smart Align Debug - Found', guides.length, 'alignment guides');
console.log('Smart Align Debug - SNAPPED! Delta:', deltaX, deltaY);
console.log('Smart Align Debug - Performance:', (alignEnd - alignStart).toFixed(2), 'ms');
```

## Future Enhancements

1. **Distance Measurements**: Show pixel distances between aligned elements
2. **Grid Snapping**: Align to invisible grid overlay
3. **Smart Layout Suggestions**: AI-powered layout recommendations
4. **Multi-directional Guides**: Diagonal alignment guides
5. **Magnetic Snapping**: Stronger attraction as elements get closer

## Performance Targets

- **60fps**: Maintain smooth animation during drag operations
- **<2ms**: Alignment calculation time for typical scenarios
- **<100 notes**: Optimal performance threshold
- **16ms**: Debounce interval for 60fps target

## Browser Compatibility

- **Canvas API**: All modern browsers
- **Performance API**: All modern browsers
- **RequestAnimationFrame**: All modern browsers
- **CSS Transforms**: All modern browsers

---

*This implementation provides professional-grade alignment capabilities matching industry-standard design tools while maintaining high performance and smooth user experience.*