interface NoteBounds {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  strength: number;
  sourceId: string;
}

interface SnapResult {
  snapped: boolean;
  deltaX: number;
  deltaY: number;
  guides: AlignmentGuide[];
}

class AlignmentSystem {
  private snapThreshold: number = 4; // 4 pixels as requested
  private guides: AlignmentGuide[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enabled: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearGuides();
    }
  }

  calculateSnap(
    draggedNote: HTMLDivElement,
    allNotes: HTMLDivElement[],
    currentX: number,
    currentY: number
  ): SnapResult {
    if (!this.enabled) {
      return { snapped: false, deltaX: 0, deltaY: 0, guides: [] };
    }

    this.guides = [];
    let snapX = currentX;
    let snapY = currentY;
    let snappedX = false;
    let snappedY = false;

    const draggedBounds: NoteBounds = {
      id: draggedNote.id,
      left: currentX,
      top: currentY,
      right: currentX + draggedNote.offsetWidth,
      bottom: currentY + draggedNote.offsetHeight,
      width: draggedNote.offsetWidth,
      height: draggedNote.offsetHeight,
      centerX: currentX + draggedNote.offsetWidth / 2,
      centerY: currentY + draggedNote.offsetHeight / 2
    };

    // Check alignment with each other note
    allNotes.forEach(note => {
      if (note === draggedNote) return;

      const targetBounds: NoteBounds = {
        id: note.id,
        left: parseInt(note.style.left) || 0,
        top: parseInt(note.style.top) || 0,
        right: (parseInt(note.style.left) || 0) + note.offsetWidth,
        bottom: (parseInt(note.style.top) || 0) + note.offsetHeight,
        width: note.offsetWidth,
        height: note.offsetHeight,
        centerX: (parseInt(note.style.left) || 0) + note.offsetWidth / 2,
        centerY: (parseInt(note.style.top) || 0) + note.offsetHeight / 2
      };

      // Check vertical alignments (left/right edges and centers)
      if (!snappedX) {
        // Left edge to left edge
        if (Math.abs(draggedBounds.left - targetBounds.left) <= this.snapThreshold) {
          snapX = targetBounds.left;
          snappedX = true;
          this.guides.push({
            type: 'vertical',
            position: targetBounds.left,
            strength: 1,
            sourceId: note.id
          });
        }
        // Right edge to right edge
        else if (Math.abs(draggedBounds.right - targetBounds.right) <= this.snapThreshold) {
          snapX = targetBounds.right - draggedBounds.width;
          snappedX = true;
          this.guides.push({
            type: 'vertical',
            position: targetBounds.right,
            strength: 1,
            sourceId: note.id
          });
        }
        // Left edge to right edge
        else if (Math.abs(draggedBounds.left - targetBounds.right) <= this.snapThreshold) {
          snapX = targetBounds.right;
          snappedX = true;
          this.guides.push({
            type: 'vertical',
            position: targetBounds.right,
            strength: 1,
            sourceId: note.id
          });
        }
        // Right edge to left edge
        else if (Math.abs(draggedBounds.right - targetBounds.left) <= this.snapThreshold) {
          snapX = targetBounds.left - draggedBounds.width;
          snappedX = true;
          this.guides.push({
            type: 'vertical',
            position: targetBounds.left,
            strength: 1,
            sourceId: note.id
          });
        }
        // Center to center
        else if (Math.abs(draggedBounds.centerX - targetBounds.centerX) <= this.snapThreshold) {
          snapX = targetBounds.centerX - draggedBounds.width / 2;
          snappedX = true;
          this.guides.push({
            type: 'vertical',
            position: targetBounds.centerX,
            strength: 1,
            sourceId: note.id
          });
        }
      }

      // Check horizontal alignments (top/bottom edges and centers)
      if (!snappedY) {
        // Top edge to top edge
        if (Math.abs(draggedBounds.top - targetBounds.top) <= this.snapThreshold) {
          snapY = targetBounds.top;
          snappedY = true;
          this.guides.push({
            type: 'horizontal',
            position: targetBounds.top,
            strength: 1,
            sourceId: note.id
          });
        }
        // Bottom edge to bottom edge
        else if (Math.abs(draggedBounds.bottom - targetBounds.bottom) <= this.snapThreshold) {
          snapY = targetBounds.bottom - draggedBounds.height;
          snappedY = true;
          this.guides.push({
            type: 'horizontal',
            position: targetBounds.bottom,
            strength: 1,
            sourceId: note.id
          });
        }
        // Top edge to bottom edge
        else if (Math.abs(draggedBounds.top - targetBounds.bottom) <= this.snapThreshold) {
          snapY = targetBounds.bottom;
          snappedY = true;
          this.guides.push({
            type: 'horizontal',
            position: targetBounds.bottom,
            strength: 1,
            sourceId: note.id
          });
        }
        // Bottom edge to top edge
        else if (Math.abs(draggedBounds.bottom - targetBounds.top) <= this.snapThreshold) {
          snapY = targetBounds.top - draggedBounds.height;
          snappedY = true;
          this.guides.push({
            type: 'horizontal',
            position: targetBounds.top,
            strength: 1,
            sourceId: note.id
          });
        }
        // Center to center
        else if (Math.abs(draggedBounds.centerY - targetBounds.centerY) <= this.snapThreshold) {
          snapY = targetBounds.centerY - draggedBounds.height / 2;
          snappedY = true;
          this.guides.push({
            type: 'horizontal',
            position: targetBounds.centerY,
            strength: 1,
            sourceId: note.id
          });
        }
      }
    });

    const result = {
      snapped: snappedX || snappedY,
      deltaX: snapX - currentX,
      deltaY: snapY - currentY,
      guides: this.guides
    };

    if (result.snapped) {
      this.renderGuides();
    }

    return result;
  }

  private renderGuides(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.guides.forEach(guide => {
      this.ctx.save();
      
      // Visual style for alignment guides
      this.ctx.strokeStyle = 'rgba(255, 0, 100, 0.8)'; // Photoshop-style magenta
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);
      
      this.ctx.beginPath();
      if (guide.type === 'vertical') {
        this.ctx.moveTo(guide.position, 0);
        this.ctx.lineTo(guide.position, this.canvas.height);
      } else {
        this.ctx.moveTo(0, guide.position);
        this.ctx.lineTo(this.canvas.width, guide.position);
      }
      this.ctx.stroke();
      
      this.ctx.restore();
    });
  }

  clearGuides(): void {
    this.guides = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// Make available globally
(window as any).AlignmentSystem = AlignmentSystem;