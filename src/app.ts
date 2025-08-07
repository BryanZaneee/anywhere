// Type definitions
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

interface NoteData {
  x: number;
  y: number;
  text: string;
  html: string;
  styles: NoteStyles;
}

interface AppDocument {
  id: string;
  title: string;
  notes: NoteData[];
  pinned: boolean;
  hasCustomTitle?: boolean;
}

interface NoteObject {
  el: HTMLDivElement;
  styles: NoteStyles;
}

interface AppSettings {
  headerIdleTimeout: number;
  headerCanHide: boolean;
}

interface KeyboardShortcut {
  action: string;
  mac: string;
  windows: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: KeyboardShortcut[];
}

interface KeyboardShortcuts {
  [key: string]: ShortcutSection;
}

interface DocumentHistoryState {
  docId: string;
  notes: NoteData[];
}

type ThemeMode = 'light' | 'dark';
type Platform = 'mac' | 'windows';
type ToolMode = 'default' | 'move' | 'hand';
type FontSize = '12px' | '14px' | '16px' | '18px' | '20px' | '24px' | '28px' | '32px' | '48px';
type FontFamily = 
  | "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
  | "Georgia,'Times New Roman',serif"
  | "'Courier New',Consolas,monospace"
  | "Arial,Helvetica,sans-serif"
  | "'Times New Roman',Times,serif"
  | "Verdana,Geneva,sans-serif";

interface DocumentsStorage {
  [id: string]: AppDocument;
}

// Note: We'll use type assertions (note as any).__noteData for the custom property

// State management
let currentNote: NoteObject | null = null;
let currentDocId: string = '';
let documents: DocumentsStorage = {};
let hasTyped: boolean = false;
let selectedNotes: Set<HTMLDivElement> = new Set();
let isSelecting: boolean = false;
let selectBox: HTMLDivElement | null = null;
let startX: number = 0;
let startY: number = 0;
let isDraggingGroup: boolean = false;
let dragHandle: HTMLDivElement | null = null;
let justCompletedSelection: boolean = false;

// Header auto-hide system
let headerIdleTimer: number | null = null;
let headerIdleTimeout: number = 10000; // 10 seconds default
let headerCanHide: boolean = true;
let isToolbarHovered: boolean = false;
let shouldShowToolbarOnHover: boolean = true;

// Tool system state
let currentTool: ToolMode = 'default';
let isPanning: boolean = false;
let panOffset: {x: number, y: number} = {x: 0, y: 0};
let lastPanPoint: {x: number, y: number} = {x: 0, y: 0};
let isSpacebarDown: boolean = false;
let isDraggingNote: boolean = false;
let draggedNote: HTMLDivElement | null = null;
let resizeHandles: HTMLDivElement[] = [];
let isResizing: boolean = false;
let resizeHandle: HTMLDivElement | null = null;
let resizeStartSize: number = 16; // Initial font size

// Utility functions
function focusCurrentNoteIfSingle(): void {
  if (currentNote && selectedNotes.size <= 1) {
    currentNote.el.focus();
  }
}

function generateTitleFromText(text: string): string {
  if (!text || typeof text !== 'string') {
    return 'Untitled';
  }
  
  // Remove HTML tags and clean up text
  const cleanText = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
  
  if (!cleanText) {
    return 'Untitled';
  }
  
  // Extract first few words, limit to 30 characters
  const words = cleanText.split(' ').filter(word => word.length > 0);
  let title = '';
  
  for (let i = 0; i < Math.min(5, words.length); i++) {
    const nextWord = words[i];
    if (title.length + nextWord.length + (i > 0 ? 1 : 0) <= 30) {
      title += (i > 0 ? ' ' : '') + nextWord;
    } else {
      break;
    }
  }
  
  return title || 'Untitled';
}

function updateUI(): void {
  updateStyles();
  updateToolbar();
}

// Tool management functions
function setToolMode(mode: ToolMode): void {
  currentTool = mode;
  updateCanvasClasses();
  updateToolbarActiveStates();
}

function toggleMoveTool(): void {
  setToolMode(currentTool === 'move' ? 'default' : 'move');
}

function toggleHandTool(): void {
  setToolMode(currentTool === 'hand' ? 'default' : 'hand');
}

function updateCanvasClasses(): void {
  canvas.classList.toggle('move-mode', currentTool === 'move');
  canvas.classList.toggle('hand-mode', currentTool === 'hand');
  
  // Update note contentEditable based on tool mode
  canvas.querySelectorAll<HTMLDivElement>('.note').forEach(note => {
    note.contentEditable = currentTool === 'default' ? 'true' : 'false';
  });
  
  // Clear resize handles when switching away from move mode
  if (currentTool !== 'move') {
    clearResizeHandles();
  }
}

function updateToolbarActiveStates(): void {
  const moveToolBtn = $('moveTool') as HTMLButtonElement;
  const handToolBtn = $('handTool') as HTMLButtonElement;
  
  moveToolBtn.classList.toggle('active', currentTool === 'move');
  handToolBtn.classList.toggle('active', currentTool === 'hand');
}

// Resize handles management
function clearResizeHandles(): void {
  resizeHandles.forEach(handle => handle.remove());
  resizeHandles = [];
}

function createResizeHandles(notes: Set<HTMLDivElement>): void {
  clearResizeHandles();
  
  if (notes.size === 0 || currentTool !== 'move') return;
  
  // Calculate bounding box for all selected notes
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  notes.forEach(note => {
    const x = parseInt(note.style.left);
    const y = parseInt(note.style.top);
    const w = note.offsetWidth;
    const h = note.offsetHeight;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });
  
  // Create 8 resize handles
  const handlePositions = [
    { class: 'corner-nw', x: minX - 4, y: minY - 4 },
    { class: 'edge-n', x: (minX + maxX) / 2 - 4, y: minY - 4 },
    { class: 'corner-ne', x: maxX - 4, y: minY - 4 },
    { class: 'edge-e', x: maxX - 4, y: (minY + maxY) / 2 - 4 },
    { class: 'corner-se', x: maxX - 4, y: maxY - 4 },
    { class: 'edge-s', x: (minX + maxX) / 2 - 4, y: maxY - 4 },
    { class: 'corner-sw', x: minX - 4, y: maxY - 4 },
    { class: 'edge-w', x: minX - 4, y: (minY + maxY) / 2 - 4 }
  ];
  
  handlePositions.forEach(pos => {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${pos.class}`;
    handle.style.left = pos.x + 'px';
    handle.style.top = pos.y + 'px';
    
    handle.onmousedown = e => {
      e.stopPropagation();
      isResizing = true;
      resizeHandle = handle;
      startX = e.clientX;
      startY = e.clientY;
      
      // Get initial font size from first selected note
      const firstNote = Array.from(selectedNotes)[0];
      if (firstNote && (firstNote as any).__noteData) {
        resizeStartSize = parseInt((firstNote as any).__noteData.styles.fontSize) || 16;
      }
    };
    
    canvas.appendChild(handle);
    resizeHandles.push(handle);
  });
}

function applyStylesAndUpdate(element: HTMLDivElement, styles: NoteStyles): void {
  applyStyles(element, styles);
  updateStyles();
}

function positionCursorInElement(element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Undo/Redo system
let documentHistory: DocumentHistoryState[] = [];
let historyIndex: number = -1;
const MAX_HISTORY: number = 50;

// DOM elements
const $: (id: string) => HTMLElement = (id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with id "${id}" not found`);
  }
  return element;
};

const appToolbar = $('toolbar') as HTMLDivElement;
const logo = $('logo') as HTMLDivElement;
const canvas = $('canvas') as HTMLDivElement;
const sidebar = $('sidebar') as HTMLDivElement;
const notesList = $('notesList') as HTMLDivElement;
const searchInput = $('searchInput') as HTMLInputElement;
const themeText = $('themeText') as HTMLSpanElement;

// Create toolbar hover zone
const toolbarHoverZone = document.createElement('div');
toolbarHoverZone.id = 'toolbarHoverZone';
document.body.appendChild(toolbarHoverZone);

// Theme management
function loadTheme(): void {
  const isDark = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark', isDark);
  themeText.textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

// Keyboard shortcuts data
const keyboardShortcuts: KeyboardShortcuts = {
  global: {
    title: "Global Shortcuts",
    shortcuts: [
      {
        action: "New Document",
        mac: "⌘ + N",
        windows: "Ctrl + N"
      },
      {
        action: "Save Document",
        mac: "⌘ + S", 
        windows: "Ctrl + S"
      },
      {
        action: "Undo",
        mac: "⌘ + Z",
        windows: "Ctrl + Z"
      },
      {
        action: "Redo",
        mac: "⌘ + Shift + Z",
        windows: "Ctrl + Shift + Z"
      },
      {
        action: "Select All Notes",
        mac: "⌘ + A",
        windows: "Ctrl + A"
      },
      {
        action: "Clear Selection",
        mac: "Escape",
        windows: "Escape"
      }
    ]
  },
  selection: {
    title: "Selection Shortcuts",
    shortcuts: [
      {
        action: "Copy Selected Notes",
        mac: "⌘ + C",
        windows: "Ctrl + C"
      },
      {
        action: "Paste Notes",
        mac: "⌘ + V",
        windows: "Ctrl + V"
      },
      {
        action: "Duplicate Selected Notes",
        mac: "⌘ + D",
        windows: "Ctrl + D"
      },
      {
        action: "Delete Selected Notes",
        mac: "Delete / Backspace",
        windows: "Delete / Backspace"
      },
      {
        action: "Move Selected Notes",
        mac: "Arrow Keys",
        windows: "Arrow Keys"
      },
      {
        action: "Move Selected Notes (10px)",
        mac: "Shift + Arrow Keys",
        windows: "Shift + Arrow Keys"
      },
      {
        action: "Increase Font Size",
        mac: "⌘ + =",
        windows: "Ctrl + ="
      },
      {
        action: "Decrease Font Size",
        mac: "⌘ + -",
        windows: "Ctrl + -"
      }
    ]
  },
  noteEditing: {
    title: "Note Editing",
    shortcuts: [
      {
        action: "Bold (within note)",
        mac: "⌘ + B",
        windows: "Ctrl + B"
      },
      {
        action: "Italic (within note)",
        mac: "⌘ + I",
        windows: "Ctrl + I"
      },
      {
        action: "Underline (within note)",
        mac: "⌘ + U",
        windows: "Ctrl + U"
      },
      {
        action: "Align Left (within note)",
        mac: "⌘ + L",
        windows: "Ctrl + L"
      },
      {
        action: "Align Center (within note)",
        mac: "⌘ + E",
        windows: "Ctrl + E"
      },
      {
        action: "Align Right (within note)",
        mac: "⌘ + R",
        windows: "Ctrl + R"
      }
    ]
  },
  formatting: {
    title: "Multi-Note Formatting",
    shortcuts: [
      {
        action: "Bold (selected notes)",
        mac: "⌘ + B",
        windows: "Ctrl + B"
      },
      {
        action: "Italic (selected notes)",
        mac: "⌘ + I",
        windows: "Ctrl + I"
      },
      {
        action: "Underline (selected notes)",
        mac: "⌘ + U",
        windows: "Ctrl + U"
      },
      {
        action: "Strikethrough",
        mac: "⌘ + Shift + X",
        windows: "Ctrl + Shift + X"
      },
      {
        action: "Align Left (selected notes)",
        mac: "⌘ + L",
        windows: "Ctrl + L"
      },
      {
        action: "Align Center (selected notes)",
        mac: "⌘ + E",
        windows: "Ctrl + E"
      },
      {
        action: "Align Right (selected notes)",
        mac: "⌘ + R",
        windows: "Ctrl + R"
      },
      {
        action: "Bullet List",
        mac: "⌘ + Shift + 8",
        windows: "Ctrl + Shift + 8"
      },
      {
        action: "Numbered List",
        mac: "⌘ + Shift + 7",
        windows: "Ctrl + Shift + 7"
      }
    ]
  }
};

// Generate shortcuts HTML for the specified platform
function generateShortcutsHTML(platform: Platform): string {
  let html = '';
  
  Object.entries(keyboardShortcuts).forEach(([category, data]) => {
    html += `
      <div class="shortcuts-section">
        <h4>${data.title}</h4>
        <div class="shortcuts-list">
    `;
    
    data.shortcuts.forEach(shortcut => {
      const key = platform === 'mac' ? shortcut.mac : shortcut.windows;
      html += `
        <div class="shortcut-item">
          <span class="shortcut-action">${shortcut.action}</span>
          <span class="shortcut-key">${key}</span>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  return html;
}

// Settings management
function loadSettings(): void {
  const saved = localStorage.getItem('anywhereSettings');
  if (saved) {
    const settings: AppSettings = JSON.parse(saved);
    headerIdleTimeout = settings.headerIdleTimeout || 10000;
    headerCanHide = settings.headerCanHide !== false;
  }
}

function saveSettings(): void {
  const settings: AppSettings = {
    headerIdleTimeout,
    headerCanHide
  };
  localStorage.setItem('anywhereSettings', JSON.stringify(settings));
}

// Helper function to show toolbar properly
function showToolbar(): void {
  appToolbar.classList.add('show');
  shouldShowToolbarOnHover = true; // Enable hover zone when toolbar is shown
  resetHeaderTimer();
}

// Header auto-hide system
function resetHeaderTimer(): void {
  if (!headerCanHide) return;
  
  // Clear existing timer
  if (headerIdleTimer) {
    clearTimeout(headerIdleTimer);
  }
  
  // Set new timer to hide toolbar
  headerIdleTimer = window.setTimeout(() => {
    if (headerCanHide && appToolbar.classList.contains('show') && !isToolbarHovered) {
      appToolbar.classList.remove('show');
      shouldShowToolbarOnHover = true; // Keep hover zone active after auto-hide
    }
  }, headerIdleTimeout);
}

function initHeaderAutoHide(): void {
  // Add event listeners for user activity
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetHeaderTimer, true);
  });
  
  // Add hover detection for toolbar
  appToolbar.addEventListener('mouseenter', () => {
    isToolbarHovered = true;
  });
  
  appToolbar.addEventListener('mouseleave', () => {
    isToolbarHovered = false;
    // Restart timer when mouse leaves toolbar
    resetHeaderTimer();
  });
  
  // Add hover zone detection to show toolbar when cursor is at top
  toolbarHoverZone.addEventListener('mouseenter', () => {
    // Show toolbar when hovering at top - always show for tool access
    if (shouldShowToolbarOnHover) {
      showToolbar();
    }
  });
  
  // Add mouseleave to restart auto-hide timer when leaving hover zone
  toolbarHoverZone.addEventListener('mouseleave', () => {
    // Restart timer when mouse leaves hover zone (if not over toolbar)
    if (!isToolbarHovered) {
      resetHeaderTimer();
    }
  });
  
  // Start the timer
  resetHeaderTimer();
}

// Document management
function loadDocuments(): void {
  const saved = localStorage.getItem('anywhereDocuments');
  if (saved) documents = JSON.parse(saved);
  
  // Migrate existing documents to include hasCustomTitle flag
  Object.values(documents).forEach(doc => {
    if (doc.hasCustomTitle === undefined) {
      // If title starts with "Note #", it was auto-generated, otherwise it's custom
      doc.hasCustomTitle = !doc.title.startsWith('Note #');
    }
  });
  
  if (!Object.keys(documents).length) {
    createNewDocument();
  } else {
    currentDocId = Object.keys(documents)[0];
    loadDocument(currentDocId);
  }
  updateNotesList();
}

function saveDocuments(): void {
  localStorage.setItem('anywhereDocuments', JSON.stringify(documents));
}

function createNewDocument(): void {
  const id = Date.now().toString();
  documents[id] = { id, title: 'Untitled', notes: [], pinned: false, hasCustomTitle: false };
  currentDocId = id;
  clearCanvas();
  saveDocuments();
  updateNotesList();
}

function clearCanvas(): void {
  canvas.querySelectorAll('.note').forEach(n => n.remove());
  logo.classList.remove('slide-away', 'hidden');
  hasTyped = false;
  selectedNotes.clear();
}

function loadDocument(id: string): void {
  clearCanvas();
  const doc = documents[id];
  if (!doc) return;
  
  currentDocId = id;
  if (doc.notes.length) {
    logo.classList.add('slide-away');
    setTimeout(() => logo.classList.add('hidden'), 500);
    hasTyped = true;
  }
  
  doc.notes.forEach(noteData => {
    const note = document.createElement('div');
    note.className = 'note';
    note.contentEditable = currentTool === 'default' ? 'true' : 'false';
    note.style.left = noteData.x + 'px';
    note.style.top = noteData.y + 'px';
    note.style.textAlign = noteData.styles.align || 'left';
    note.innerHTML = noteData.html || noteData.text || '';
    
    const noteObj: NoteObject = {
      el: note,
      styles: { ...noteData.styles, align: noteData.styles.align || 'left' }
    };
    
    applyStyles(note, noteData.styles);
    canvas.appendChild(note);
    setupNote(note, noteObj);
  });
  
  updateNotesList();
  updateCanvasClasses(); // Ensure notes respect current tool mode
}

function saveCurrentDocument(): void {
  if (!currentDocId) return;
  
  const notes: NoteData[] = Array.from(canvas.querySelectorAll<HTMLDivElement>('.note')).map(note => {
    const noteData = (note as any).__noteData;
    return {
      x: parseInt(note.style.left),
      y: parseInt(note.style.top),
      text: note.textContent || '',
      html: note.innerHTML || '',
      styles: noteData ? noteData.styles : {
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        fontSize: '16px',
        fontFamily: '-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif',
        align: 'left',
        listType: 'none'
      }
    };
  });
  
  documents[currentDocId].notes = notes;
  
  // Auto-generate title from first note if document hasn't been manually titled
  const currentDoc = documents[currentDocId];
  if (!currentDoc.hasCustomTitle && notes.length > 0) {
    const firstNoteText = notes[0].text;
    if (firstNoteText && firstNoteText.trim()) {
      const newTitle = generateTitleFromText(firstNoteText);
      if (newTitle !== 'Untitled') {
        currentDoc.title = newTitle;
        updateNotesList(); // Update the sidebar display immediately
      }
    }
  }
  
  saveDocuments();
}

// Undo/Redo system functions
function saveToHistory(): void {
  if (!currentDocId) return;
  
  // Create a deep copy of the current document state
  const currentState: DocumentHistoryState = {
    docId: currentDocId,
    notes: JSON.parse(JSON.stringify(documents[currentDocId].notes))
  };
  
  // Remove any history after current index (when undoing then making new changes)
  if (historyIndex < documentHistory.length - 1) {
    documentHistory = documentHistory.slice(0, historyIndex + 1);
  }
  
  // Add new state
  documentHistory.push(currentState);
  
  // Keep history within limits
  if (documentHistory.length > MAX_HISTORY) {
    documentHistory.shift();
  } else {
    historyIndex++;
  }
}

function undo(): boolean {
  if (historyIndex <= 0) return false;
  
  historyIndex--;
  const state = documentHistory[historyIndex];
  
  if (state.docId === currentDocId) {
    // Restore document state
    documents[currentDocId].notes = JSON.parse(JSON.stringify(state.notes));
    loadDocument(currentDocId);
    return true;
  }
  return false;
}

function redo(): boolean {
  if (historyIndex >= documentHistory.length - 1) return false;
  
  historyIndex++;
  const state = documentHistory[historyIndex];
  
  if (state.docId === currentDocId) {
    // Restore document state
    documents[currentDocId].notes = JSON.parse(JSON.stringify(state.notes));
    loadDocument(currentDocId);
    return true;
  }
  return false;
}

// Note list UI
function updateNotesList(): void {
  notesList.innerHTML = '';
  const docs = Object.values(documents)
    .filter(doc => doc.title.toLowerCase().includes(searchInput.value.toLowerCase()));
  
  const pinned = docs.filter(d => d.pinned);
  const unpinned = docs.filter(d => !d.pinned);
  
  if (pinned.length) {
    const section = document.createElement('div');
    section.className = 'pinned-section';
    const title = document.createElement('div');
    title.className = 'pinned-title';
    title.textContent = 'Pinned';
    section.appendChild(title);
    pinned.forEach(doc => section.appendChild(createNoteItem(doc)));
    notesList.appendChild(section);
  }
  
  unpinned.forEach(doc => notesList.appendChild(createNoteItem(doc)));
}

function createNoteItem(doc: AppDocument): HTMLDivElement {
  const item = document.createElement('div');
  item.className = 'note-item';
  if (doc.id === currentDocId) item.classList.add('active');
  
  const textDiv = document.createElement('div');
  textDiv.className = 'note-text';
  const text = document.createElement('span');
  text.textContent = doc.title;
  text.ondblclick = e => {
    e.stopPropagation();
    startInlineEdit();
  };
  textDiv.appendChild(text);
  item.appendChild(textDiv);
  
  // Make entire item clickable
  item.onclick = e => {
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest('.note-actions')) return;
    loadDocument(doc.id);
  };
  
  const actions = document.createElement('div');
  actions.className = 'note-actions';
  
  // Pin button
  const pinBtn = document.createElement('button');
  pinBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="${doc.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
    <path d="M12 2L9 9H2l6 4-2 7 6-5 6 5-2-7 6-4h-7z"/>
  </svg>`;
  pinBtn.onclick = e => {
    e.stopPropagation();
    doc.pinned = !doc.pinned;
    saveDocuments();
    updateNotesList();
  };
  
  // Edit button
  const editBtn = document.createElement('button');
  editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
  editBtn.onclick = e => {
    e.stopPropagation();
    startInlineEdit();
  };
  
  // Inline edit function
  function startInlineEdit(): void {
    const input = document.createElement('input');
    input.value = doc.title;
    input.onblur = () => {
      if (input.value.trim()) {
        doc.title = input.value.trim();
        doc.hasCustomTitle = true; // Mark as manually titled
        saveDocuments();
      }
      updateNotesList();
    };
    input.onkeydown = e => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        updateNotesList();
      }
    };
    textDiv.innerHTML = '';
    textDiv.appendChild(input);
    input.focus();
    input.select();
  }
  
  // Delete button
  const delBtn = document.createElement('button');
  delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`;
  delBtn.onclick = e => {
    e.stopPropagation();
    showDeleteModal(doc);
  };
  
  actions.appendChild(pinBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  item.appendChild(actions);
  
  return item;
}

function showDeleteModal(doc: AppDocument): void {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Delete this note?</h3>
      <p>This action cannot be undone.</p>
      <div class="modal-buttons">
        <button class="cancel">Cancel</button>
        <button class="confirm">OK</button>
      </div>
    </div>
  `;
  
  modal.querySelector<HTMLButtonElement>('.cancel')!.onclick = () => modal.remove();
  modal.querySelector<HTMLButtonElement>('.confirm')!.onclick = () => {
    delete documents[doc.id];
    if (doc.id === currentDocId) {
      const remaining = Object.keys(documents);
      if (remaining.length) {
        loadDocument(remaining[0]);
      } else {
        createNewDocument();
      }
    }
    saveDocuments();
    updateNotesList();
    modal.remove();
  };
  
  document.body.appendChild(modal);
}

function showSettingsModal(): void {
  // Detect user's platform for default preference
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const defaultPlatform: Platform = isMac ? 'mac' : 'windows';
  const preferredPlatform: Platform = (localStorage.getItem('preferredShortcutPlatform') as Platform) || defaultPlatform;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content settings-modal tabbed-modal">
      <button class="modal-close">×</button>
      
      <div class="settings-body">
        <div class="settings-sidebar">
          <div class="settings-tab active" data-tab="options" title="Options">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Options</span>
          </div>
          <div class="settings-tab" data-tab="shortcuts" title="Keyboard Shortcuts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>Shortcuts</span>
          </div>
        </div>
        
        <div class="settings-content">
          <div class="settings-panel active" id="options-panel">
            <div class="settings-header">
              <h3>General</h3>
              <p class="tab-description">Application settings and preferences</p>
            </div>
            <div class="setting-group">
              <label for="idleTimeInput">Toolbar auto-hide delay (seconds):</label>
              <input type="number" id="idleTimeInput" min="1" max="99" value="${headerIdleTimeout / 1000}">
            </div>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" id="headerToggle" ${headerCanHide ? 'checked' : ''}>
                Allow toolbar to auto-hide
              </label>
            </div>
            
            <div class="setting-group">
              <button class="delete-all-btn" id="deleteAllNotes">Delete All Notes</button>
            </div>
          </div>
          
          <div class="settings-panel" id="shortcuts-panel">
            <div class="settings-header">
              <h3>Shortcuts</h3>
              <p class="tab-description">Keyboard shortcuts and hotkeys</p>
            </div>
            <div class="platform-toggle">
              <span class="toggle-label">Show shortcuts for:</span>
              <div class="toggle-switch">
                <input type="radio" id="platform-mac" name="platform" value="mac" ${preferredPlatform === 'mac' ? 'checked' : ''}>
                <label for="platform-mac">Mac</label>
                <input type="radio" id="platform-windows" name="platform" value="windows" ${preferredPlatform === 'windows' ? 'checked' : ''}>
                <label for="platform-windows">Windows</label>
              </div>
            </div>
            
            <div class="shortcuts-content" id="shortcuts-content">
              ${generateShortcutsHTML(preferredPlatform)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const idleTimeInput = modal.querySelector<HTMLInputElement>('#idleTimeInput')!;
  const headerToggle = modal.querySelector<HTMLInputElement>('#headerToggle')!;
  
  // Close button handler
  modal.querySelector<HTMLButtonElement>('.modal-close')!.onclick = () => modal.remove();
  
  // Tab switching functionality
  const tabs = modal.querySelectorAll('.settings-tab');
  const panels = modal.querySelectorAll('.settings-panel');
  
  tabs.forEach(tab => {
    (tab as HTMLElement).onclick = () => {
      // Remove active class from all tabs and panels
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding panel
      tab.classList.add('active');
      const tabElement = tab as HTMLElement;
      const targetPanel = modal.querySelector(`#${tabElement.dataset.tab}-panel`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    };
  });
  
  // Platform toggle functionality
  const platformRadios = modal.querySelectorAll<HTMLInputElement>('input[name="platform"]');
  const shortcutsContent = modal.querySelector<HTMLDivElement>('#shortcuts-content')!;
  
  platformRadios.forEach(radio => {
    radio.onchange = () => {
      if (radio.checked) {
        shortcutsContent.innerHTML = generateShortcutsHTML(radio.value as Platform);
        localStorage.setItem('preferredShortcutPlatform', radio.value);
      }
    };
  });
  
  // Auto-save functionality
  function autoSaveSettings(): void {
    headerIdleTimeout = parseInt(idleTimeInput.value) * 1000;
    headerCanHide = headerToggle.checked;
    saveSettings();
    
    // Reset header visibility based on new settings
    if (headerCanHide) {
      resetHeaderTimer();
    } else {
      if (headerIdleTimer) {
        clearTimeout(headerIdleTimer);
      }
    }
  }
  
  // Validate number input and auto-save
  idleTimeInput.oninput = () => {
    let value = parseInt(idleTimeInput.value);
    if (isNaN(value) || value < 1) {
      idleTimeInput.value = '1';
    } else if (value > 99) {
      idleTimeInput.value = '99';
    }
    autoSaveSettings();
  };
  
  // Auto-save when checkbox changes
  headerToggle.onchange = autoSaveSettings;
  
  modal.querySelector<HTMLButtonElement>('#deleteAllNotes')!.onclick = () => {
    modal.remove();
    showDeleteAllModal();
  };
  
  document.body.appendChild(modal);
}

function showDeleteAllModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Delete All Notes?</h3>
      <p><strong>This will permanently delete all notes in the current document.</strong></p>
      <p>This action cannot be undone.</p>
      <div class="modal-buttons">
        <button class="cancel">Cancel</button>
        <button class="confirm delete-confirm">Delete All</button>
      </div>
    </div>
  `;
  
  modal.querySelector<HTMLButtonElement>('.cancel')!.onclick = () => modal.remove();
  modal.querySelector<HTMLButtonElement>('.confirm')!.onclick = () => {
    // Clear all notes from current document
    if (currentDocId && documents[currentDocId]) {
      documents[currentDocId].notes = [];
      clearCanvas();
      saveDocuments();
    }
    modal.remove();
  };
  
  document.body.appendChild(modal);
}

// Note setup and interactions
function setupNote(note: HTMLDivElement, noteObj: NoteObject): void {
  (note as any).__noteData = noteObj;
  
  note.addEventListener('mousedown', e => {
    // Use position-based detection to determine if click is over actual text content
    const hasExistingSelection = window.getSelection()?.toString();
    
    // Check if the click position is over text content using Range API
    let isOverTextContent = false;
    try {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range && range.startContainer) {
        // If we can get a valid range and it's within this note, it's over text content
        isOverTextContent = note.contains(range.startContainer) && 
                           (range.startContainer.nodeType === Node.TEXT_NODE || 
                            range.startContainer !== note);
      }
    } catch (err) {
      // Fallback: if Range API fails, allow text selection by default
      isOverTextContent = e.target !== note;
    }
    
    // In move mode, always select the note for moving and enable dragging
    if (currentTool === 'move') {
      if (!e.shiftKey) selectedNotes.clear();
      selectedNotes.add(note);
      updateSelection();
      
      // Enable dragging
      isDraggingNote = true;
      draggedNote = note;
      startX = e.clientX;
      startY = e.clientY;
      
      e.preventDefault();
      return;
    }
    
    // In default mode, handle text selection vs note selection
    if (isOverTextContent && !hasExistingSelection) {
      return; // Let browser handle text selection naturally
    }
    
    // Only handle note selection when clicking on empty areas
    if (e.target === note && !hasExistingSelection && !isOverTextContent) {
      if (!e.shiftKey) selectedNotes.clear();
      selectedNotes.add(note);
      updateSelection();
      e.preventDefault();
    }
  });
  
  note.addEventListener('focus', () => {
    if (currentTool === 'default') {
      currentNote = noteObj;
      showToolbar();
      updateToolbar();
    }
  });
  
  note.addEventListener('blur', () => {
    if (!note.innerHTML.trim()) note.remove();
    saveCurrentDocument();
  });
  
  note.addEventListener('input', () => {
    if (!hasTyped && note.textContent?.length) {
      hasTyped = true;
      logo.classList.add('slide-away');
      setTimeout(() => logo.classList.add('hidden'), 500);
    }
    saveCurrentDocument();
  });
  
  note.addEventListener('mouseup', () => {
    // Show toolbar when text is selected
    if (window.getSelection()?.toString()) {
      currentNote = noteObj;
      showToolbar();
      updateToolbar();
    }
  });
  
  // Handle text selection changes
  note.addEventListener('selectstart', () => {
    // Allow text selection to start naturally
    currentNote = noteObj;
  });
  
  // Note keyboard shortcuts
  note.addEventListener('keydown', e => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
    
    if (ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          break;
      }
    }
    
    // List shortcuts with Ctrl+Shift
    if (ctrlKey && e.shiftKey) {
      switch (e.key) {
        case '*':
        case '8':
          e.preventDefault();
          toggleBulletList();
          break;
        case '&':
        case '7':
          e.preventDefault();
          toggleNumberedList();
          break;
      }
    }
  });
}

// Selection management
function updateSelection(): void {
  canvas.querySelectorAll('.note').forEach(n => {
    n.classList.toggle('selected', selectedNotes.has(n as HTMLDivElement));
  });
  
  // Remove old handle
  const oldHandle = canvas.querySelector('.selection-handle');
  if (oldHandle) oldHandle.remove();
  
  if (selectedNotes.size > 1) {
    // Show handle for group dragging
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    selectedNotes.forEach(note => {
      const x = parseInt(note.style.left);
      const y = parseInt(note.style.top);
      const w = note.offsetWidth;
      const h = note.offsetHeight;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    
    dragHandle = document.createElement('div');
    dragHandle.className = 'selection-handle';
    dragHandle.style.left = (maxX - 6) + 'px';
    dragHandle.style.top = (maxY - 6) + 'px';
    canvas.appendChild(dragHandle);
    
    dragHandle.onmousedown = e => {
      e.stopPropagation();
      isDraggingGroup = true;
      startX = e.clientX;
      startY = e.clientY;
    };
    
    showToolbar();
    updateToolbar();
  } else if (selectedNotes.size === 1) {
    const note = Array.from(selectedNotes)[0];
    currentNote = (note as any).__noteData!;
    showToolbar();
    updateToolbar();
  } else {
    appToolbar.classList.remove('show');
    shouldShowToolbarOnHover = false; // Disable hover zone when no selection
  }
  
  // Create resize handles in move mode
  if (currentTool === 'move' && selectedNotes.size > 0) {
    createResizeHandles(selectedNotes);
  } else {
    clearResizeHandles();
  }
}

// Styling functions
function applyStyles(el: HTMLDivElement, styles: NoteStyles): void {
  el.style.fontWeight = styles.bold ? 'bold' : 'normal';
  el.style.fontStyle = styles.italic ? 'italic' : 'normal';
  el.style.textDecoration = 
    (styles.underline ? 'underline ' : '') + (styles.strike ? 'line-through' : '');
  el.style.fontSize = styles.fontSize;
  el.style.fontFamily = styles.fontFamily;
  el.style.textAlign = styles.align || 'left';
  
  // Handle list formatting
  if (styles.listType && styles.listType !== 'none') {
    const text = el.textContent || el.innerHTML;
    if (text && !el.querySelector('ul, ol')) {
      // Convert text to list if not already formatted
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const listTag = styles.listType === 'bullet' ? 'ul' : 'ol';
        const listItems = lines.map(line => `<li>${line.trim()}</li>`).join('');
        el.innerHTML = `<${listTag}>${listItems}</${listTag}>`;
      }
    }
  } else if (styles.listType === 'none') {
    // Convert list back to plain text if needed
    const lists = el.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const text = Array.from(list.querySelectorAll('li')).map(li => li.textContent).join('\n');
      list.outerHTML = text;
    });
  }
}

function updateStyles(): void {
  if (selectedNotes.size > 1) {
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        applyStyles(note, (note as any).__noteData.styles);
      }
    });
  } else if (currentNote) {
    applyStyles(currentNote.el, currentNote.styles);
  }
  saveCurrentDocument();
}

function toggleBulletList(): void {
  const sel = window.getSelection();
  if (sel?.toString() && sel.rangeCount) {
    // Text is selected - apply to selection
    document.execCommand('insertUnorderedList');
    saveCurrentDocument();
  } else if (selectedNotes.size > 1) {
    // Multiple notes selected
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        const currentListType = (note as any).__noteData.styles.listType;
        const isTogglingOn = currentListType !== 'bullet';
        (note as any).__noteData.styles.listType = isTogglingOn ? 'bullet' : 'none';
        
        // If note is empty and we're turning on list, insert empty list item
        if (isTogglingOn && !note.textContent?.trim()) {
          note.innerHTML = '<ul><li></li></ul>';
          // Position cursor in the list item
          const li = note.querySelector('li');
          if (li) {
            li.focus();
            positionCursorInElement(li);
          }
        } else {
          applyStyles(note, (note as any).__noteData.styles);
        }
      }
    });
    updateStyles();
  } else if (currentNote) {
    // Single note, no selection
    const currentListType = currentNote.styles.listType;
    const isTogglingOn = currentListType !== 'bullet';
    currentNote.styles.listType = isTogglingOn ? 'bullet' : 'none';
    
    // If note is empty and we're turning on list, insert empty list item
    if (isTogglingOn && !currentNote.el.textContent?.trim()) {
      currentNote.el.innerHTML = '<ul><li></li></ul>';
      // Position cursor in the list item
      const li = currentNote.el.querySelector('li');
      if (li) {
        li.focus();
        positionCursorInElement(li);
      }
    } else {
      applyStyles(currentNote.el, currentNote.styles);
    }
    updateStyles();
  }
  updateToolbar();
  focusCurrentNoteIfSingle();
}

function toggleNumberedList(): void {
  const sel = window.getSelection();
  if (sel?.toString() && sel.rangeCount) {
    // Text is selected - apply to selection
    document.execCommand('insertOrderedList');
    saveCurrentDocument();
  } else if (selectedNotes.size > 1) {
    // Multiple notes selected
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        const currentListType = (note as any).__noteData.styles.listType;
        const isTogglingOn = currentListType !== 'numbered';
        (note as any).__noteData.styles.listType = isTogglingOn ? 'numbered' : 'none';
        
        // If note is empty and we're turning on list, insert empty list item
        if (isTogglingOn && !note.textContent?.trim()) {
          note.innerHTML = '<ol><li></li></ol>';
          // Position cursor in the list item
          const li = note.querySelector('li');
          if (li) {
            li.focus();
            positionCursorInElement(li);
          }
        } else {
          applyStyles(note, (note as any).__noteData.styles);
        }
      }
    });
    updateStyles();
  } else if (currentNote) {
    // Single note, no selection
    const currentListType = currentNote.styles.listType;
    const isTogglingOn = currentListType !== 'numbered';
    currentNote.styles.listType = isTogglingOn ? 'numbered' : 'none';
    
    // If note is empty and we're turning on list, insert empty list item
    if (isTogglingOn && !currentNote.el.textContent?.trim()) {
      currentNote.el.innerHTML = '<ol><li></li></ol>';
      // Position cursor in the list item
      const li = currentNote.el.querySelector('li');
      if (li) {
        li.focus();
        positionCursorInElement(li);
      }
    } else {
      applyStyles(currentNote.el, currentNote.styles);
    }
    updateStyles();
  }
  updateToolbar();
  focusCurrentNoteIfSingle();
}

function updateToolbar(): void {
  if (selectedNotes.size > 1) {
    const firstNote = (Array.from(selectedNotes)[0] as any).__noteData;
    if (firstNote) {
      const s = firstNote.styles;
      // Show formatting buttons for multi-selection too
      ($('bold') as HTMLButtonElement).classList.toggle('active', s.bold);
      ($('italic') as HTMLButtonElement).classList.toggle('active', s.italic);
      ($('underline') as HTMLButtonElement).classList.toggle('active', s.underline);
      ($('strike') as HTMLButtonElement).classList.toggle('active', s.strike);
      ($('alignLeft') as HTMLButtonElement).classList.toggle('active', s.align === 'left');
      ($('alignCenter') as HTMLButtonElement).classList.toggle('active', s.align === 'center');
      ($('alignRight') as HTMLButtonElement).classList.toggle('active', s.align === 'right');
      ($('bulletList') as HTMLButtonElement).classList.toggle('active', s.listType === 'bullet');
      ($('numberedList') as HTMLButtonElement).classList.toggle('active', s.listType === 'numbered');
      ($('fontSize') as HTMLSelectElement).value = s.fontSize;
      ($('fontFamily') as HTMLSelectElement).value = s.fontFamily;
    }
  } else if (currentNote) {
    const s = currentNote.styles;
    ($('bold') as HTMLButtonElement).classList.toggle('active', s.bold);
    ($('italic') as HTMLButtonElement).classList.toggle('active', s.italic);
    ($('underline') as HTMLButtonElement).classList.toggle('active', s.underline);
    ($('strike') as HTMLButtonElement).classList.toggle('active', s.strike);
    ($('alignLeft') as HTMLButtonElement).classList.toggle('active', s.align === 'left');
    ($('alignCenter') as HTMLButtonElement).classList.toggle('active', s.align === 'center');
    ($('alignRight') as HTMLButtonElement).classList.toggle('active', s.align === 'right');
    ($('bulletList') as HTMLButtonElement).classList.toggle('active', s.listType === 'bullet');
    ($('numberedList') as HTMLButtonElement).classList.toggle('active', s.listType === 'numbered');
    ($('fontSize') as HTMLSelectElement).value = s.fontSize;
    ($('fontFamily') as HTMLSelectElement).value = s.fontFamily;
  }
}

// Canvas interactions
canvas.addEventListener('mousedown', e => {
  // Handle pan mode (hand tool, spacebar held, or middle mouse button)
  if (currentTool === 'hand' || isSpacebarDown || e.button === 1) {
    e.preventDefault();
    isPanning = true;
    lastPanPoint = { x: e.clientX, y: e.clientY };
    document.body.classList.add('panning');
    canvas.classList.add('panning');
    return;
  }
  
  // Existing selection logic
  if (!(e.target as HTMLElement).classList.contains('note') && e.target !== logo && e.target !== dragHandle) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    selectBox = document.createElement('div');
    selectBox.className = 'select-box';
    canvas.appendChild(selectBox);
    if (!e.shiftKey) {
      selectedNotes.clear();
      // Don't update selection immediately - wait for mousemove to add notes
      // This prevents toolbar from hiding during drag selection
    }
  }
});

canvas.addEventListener('mousemove', e => {
  // Handle panning
  if (isPanning) {
    e.preventDefault();
    const dx = e.clientX - lastPanPoint.x;
    const dy = e.clientY - lastPanPoint.y;
    
    panOffset.x += dx;
    panOffset.y += dy;
    
    // Apply pan transform to canvas
    canvas.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px)`;
    
    lastPanPoint = { x: e.clientX, y: e.clientY };
    return;
  }
  
  if (isSelecting && selectBox) {
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selectBox.style.left = (x - canvas.offsetLeft) + 'px';
    selectBox.style.top = y + 'px';
    selectBox.style.width = w + 'px';
    selectBox.style.height = h + 'px';
    
    const rect = { left: x, top: y, right: x + w, bottom: y + h };
    let selectionChanged = false;
    const previousSize = selectedNotes.size;
    
    canvas.querySelectorAll<HTMLDivElement>('.note').forEach(note => {
      const nr = note.getBoundingClientRect();
      const shouldBeSelected = nr.left < rect.right && nr.right > rect.left && 
                              nr.top < rect.bottom && nr.bottom > rect.top;
      
      if (shouldBeSelected && !selectedNotes.has(note)) {
        selectedNotes.add(note);
        selectionChanged = true;
      } else if (!shouldBeSelected && !e.shiftKey && selectedNotes.has(note)) {
        selectedNotes.delete(note);
        selectionChanged = true;
      }
    });
    
    // Only update selection if it actually changed
    if (selectionChanged || selectedNotes.size !== previousSize) {
      updateSelection();
    }
  }
});

canvas.addEventListener('mouseup', e => {
  // Handle pan end
  if (isPanning) {
    isPanning = false;
    document.body.classList.remove('panning');
    canvas.classList.remove('panning');
    return;
  }
  
  if (isSelecting) {
    isSelecting = false;
    if (selectBox) {
      selectBox.remove();
      selectBox = null;
    }
    // Ensure final selection state is updated
    updateSelection();
    
    // Set flag if we actually selected notes during the drag
    if (selectedNotes.size > 0) {
      justCompletedSelection = true;
      // Clear flag after a short delay to allow click event to check it
      setTimeout(() => { justCompletedSelection = false; }, 50);
    }
  }
});

canvas.addEventListener('click', e => {
  if (e.target === canvas || e.target === logo) {
    // If we just completed a selection, don't clear it or create a new note
    if (justCompletedSelection) {
      return;
    }
    
    // Clear selection if clicking on canvas (unless shift-clicking)
    if (!isSelecting && !e.shiftKey) {
      selectedNotes.clear();
      updateSelection();
    }
    
    // Create new note if clicking on canvas (not logo) and in default mode
    if (e.target !== logo && currentTool === 'default') {
      // Save state before creating new note
      saveToHistory();
      
      const note = document.createElement('div');
      note.className = 'note';
      note.contentEditable = currentTool === 'default' ? 'true' : 'false';
      note.style.left = (e.clientX - canvas.offsetLeft) + 'px';
      note.style.top = e.clientY + 'px';
      
      const noteObj: NoteObject = {
        el: note,
        styles: {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          fontSize: '16px',
          fontFamily: '-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif',
          align: 'left',
          listType: 'none'
        }
      };
      
      canvas.appendChild(note);
      setupNote(note, noteObj);
      note.focus();
    }
  }
});

// Toolbar interactions
document.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  if (!appToolbar.contains(target) && 
      !target.classList.contains('note') &&
      !(document.activeElement as HTMLElement)?.classList.contains('note') &&
      selectedNotes.size === 0) {
    appToolbar.classList.remove('show');
    shouldShowToolbarOnHover = false; // Disable hover zone when clicking elsewhere
  }
});

document.addEventListener('mousemove', e => {
  if (isDraggingGroup) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    selectedNotes.forEach(note => {
      const x = parseInt(note.style.left);
      const y = parseInt(note.style.top);
      note.style.left = (x + dx) + 'px';
      note.style.top = (y + dy) + 'px';
    });
    if (dragHandle) {
      const hx = parseInt(dragHandle.style.left);
      const hy = parseInt(dragHandle.style.top);
      dragHandle.style.left = (hx + dx) + 'px';
      dragHandle.style.top = (hy + dy) + 'px';
    }
    
    // Update resize handles to follow the notes
    if (currentTool === 'move' && selectedNotes.size > 0) {
      createResizeHandles(selectedNotes);
    }
    
    startX = e.clientX;
    startY = e.clientY;
  }
  
  // Handle individual note dragging in move mode
  if (isDraggingNote && draggedNote) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Move all selected notes (including the dragged note)
    selectedNotes.forEach(note => {
      const x = parseInt(note.style.left);
      const y = parseInt(note.style.top);
      note.style.left = (x + dx) + 'px';
      note.style.top = (y + dy) + 'px';
    });
    
    // Update resize handles to follow the notes
    if (currentTool === 'move' && selectedNotes.size > 0) {
      createResizeHandles(selectedNotes);
    }
    
    startX = e.clientX;
    startY = e.clientY;
  }
  
  // Handle resize
  if (isResizing && resizeHandle && selectedNotes.size > 0) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Calculate size change based on diagonal movement
    const distance = Math.sqrt(dx * dx + dy * dy);
    const sizeChange = Math.round(distance * 0.2); // Scale factor for font size change
    
    // Determine direction (increase or decrease size)
    const handleClass = resizeHandle.className;
    let newSize = resizeStartSize;
    
    if (handleClass.includes('corner-se') || handleClass.includes('corner-ne')) {
      // Bottom-right or top-right corners: drag right/down to increase
      newSize = resizeStartSize + (dx > 0 ? sizeChange : -sizeChange);
    } else if (handleClass.includes('corner-sw') || handleClass.includes('corner-nw')) {
      // Bottom-left or top-left corners: drag left/up to increase
      newSize = resizeStartSize + (dx < 0 ? sizeChange : -sizeChange);
    } else {
      // Edge handles: use combined movement
      newSize = resizeStartSize + ((dx + dy) > 0 ? sizeChange : -sizeChange);
    }
    
    // Clamp font size between 8px and 72px
    newSize = Math.max(8, Math.min(72, newSize));
    
    // Apply new font size to all selected notes
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        (note as any).__noteData.styles.fontSize = newSize + 'px';
        applyStyles(note, (note as any).__noteData.styles);
      }
    });
    
    // Update resize handles position after size change
    createResizeHandles(selectedNotes);
  }
});

document.addEventListener('mouseup', () => {
  if (isDraggingGroup) {
    isDraggingGroup = false;
    saveCurrentDocument();
  }
  
  // Handle note dragging end
  if (isDraggingNote) {
    isDraggingNote = false;
    draggedNote = null;
    saveCurrentDocument();
  }
  
  // Handle resize end
  if (isResizing) {
    isResizing = false;
    resizeHandle = null;
    saveCurrentDocument();
  }
});

// Tool buttons
$('handTool').onclick = toggleHandTool;
$('moveTool').onclick = toggleMoveTool;

// Toolbar buttons
['bold', 'italic', 'underline', 'strike'].forEach(id => {
  $(id).onclick = () => {
    const sel = window.getSelection();
    if (sel?.toString() && sel.rangeCount) {
      // Text is selected - apply to selection
      if (id === 'strike') {
        document.execCommand('strikethrough');
      } else {
        document.execCommand(id);
      }
      saveCurrentDocument();
    } else if (selectedNotes.size > 1) {
      // Multiple notes selected
      selectedNotes.forEach(note => {
        if ((note as any).__noteData) {
          ((note as any).__noteData.styles as any)[id] = !((note as any).__noteData.styles as any)[id];
          applyStyles(note, (note as any).__noteData.styles);
        }
      });
      updateStyles();
    } else if (currentNote) {
      // Single note, no selection
      (currentNote.styles as any)[id] = !(currentNote.styles as any)[id];
      applyStylesAndUpdate(currentNote.el, currentNote.styles);
    }
    updateToolbar();
    focusCurrentNoteIfSingle();
  };
});

['alignLeft', 'alignCenter', 'alignRight'].forEach(align => {
  $(align).onclick = () => {
    const alignValue = align.replace('align', '').toLowerCase() as 'left' | 'center' | 'right';
    if (selectedNotes.size > 1) {
      selectedNotes.forEach(note => {
        if ((note as any).__noteData) {
          (note as any).__noteData.styles.align = alignValue;
          applyStyles(note, (note as any).__noteData.styles);
        }
      });
    } else if (currentNote) {
      currentNote.styles.align = alignValue;
      applyStyles(currentNote.el, currentNote.styles);
    }
    updateStyles();
    updateToolbar();
    focusCurrentNoteIfSingle();
  };
});

// List buttons
$('bulletList').onclick = toggleBulletList;
$('numberedList').onclick = toggleNumberedList;

($('fontSize') as HTMLSelectElement).onchange = () => {
  const size = ($('fontSize') as HTMLSelectElement).value as FontSize;
  const sel = window.getSelection();
  
  if (sel?.toString() && sel.rangeCount) {
    // Apply to selected text
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = size;
    try {
      range.surroundContents(span);
    } catch (e) {
      document.execCommand('fontSize', false, '7');
      const fontElements = currentNote?.el.getElementsByTagName('font');
      if (fontElements) {
        for (let font of fontElements) {
          if ((font as any).size === '7') {
            font.removeAttribute('size');
            font.style.fontSize = size;
          }
        }
      }
    }
    saveCurrentDocument();
  } else if (selectedNotes.size > 1) {
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        (note as any).__noteData.styles.fontSize = size;
        applyStyles(note, (note as any).__noteData.styles);
      }
    });
    updateStyles();
  } else if (currentNote) {
    currentNote.styles.fontSize = size;
    applyStylesAndUpdate(currentNote.el, currentNote.styles);
  }
  focusCurrentNoteIfSingle();
};

($('fontFamily') as HTMLSelectElement).onchange = () => {
  const font = ($('fontFamily') as HTMLSelectElement).value as FontFamily;
  const sel = window.getSelection();
  
  if (sel?.toString() && sel.rangeCount) {
    // Apply to selected text
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontFamily = font;
    try {
      range.surroundContents(span);
    } catch (e) {
      document.execCommand('fontName', false, font);
    }
    saveCurrentDocument();
  } else if (selectedNotes.size > 1) {
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        (note as any).__noteData.styles.fontFamily = font;
        applyStyles(note, (note as any).__noteData.styles);
      }
    });
    updateStyles();
  } else if (currentNote) {
    currentNote.styles.fontFamily = font;
    applyStylesAndUpdate(currentNote.el, currentNote.styles);
  }
  focusCurrentNoteIfSingle();
};

// Sidebar buttons
$('newNote').onclick = createNewDocument;

$('searchBtn').onclick = () => {
  sidebar.classList.toggle('exp');
  if (sidebar.classList.contains('exp')) searchInput.focus();
};

$('libraryBtn').onclick = () => sidebar.classList.toggle('exp');

$('settingsBtn').onclick = () => showSettingsModal();

$('themeToggle').onclick = () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark.toString());
  themeText.textContent = isDark ? 'Dark Mode' : 'Light Mode';
};

searchInput.oninput = updateNotesList;

// Global keyboard shortcuts
document.addEventListener('keydown', e => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
  
  // Handle Escape key to clear selection
  if (e.key === 'Escape' && selectedNotes.size > 0) {
    e.preventDefault();
    selectedNotes.clear();
    updateSelection();
    return;
  }
  
  
  // Handle spacebar for pan mode
  if (e.key === ' ' && !isSpacebarDown && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    isSpacebarDown = true;
    document.body.classList.add('pan-active');
    return;
  }
  
  // Handle Undo/Redo
  if (ctrlKey && e.key.toLowerCase() === 'z' && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  
  // Handle Cmd+N for new document
  if (ctrlKey && e.key.toLowerCase() === 'n' && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    createNewDocument();
    return;
  }
  
  // Handle Cmd+S for save
  if (ctrlKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveCurrentDocument();
    return;
  }
  
  // Handle Cmd+D for duplicate selected notes
  if (ctrlKey && e.key.toLowerCase() === 'd' && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    saveToHistory();
    const offset = 20;
    selectedNotes.forEach(note => {
      const newNote = note.cloneNode(true) as HTMLDivElement;
      const x = parseInt(note.style.left) + offset;
      const y = parseInt(note.style.top) + offset;
      newNote.style.left = x + 'px';
      newNote.style.top = y + 'px';
      
      const noteObj: NoteObject = {
        el: newNote,
        styles: { ...(note as any).__noteData!.styles }
      };
      
      canvas.appendChild(newNote);
      setupNote(newNote, noteObj);
    });
    saveCurrentDocument();
    return;
  }
  
  // Handle font size changes with Cmd+Plus/Minus
  if (ctrlKey && (e.key === '=' || e.key === '+') && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        const currentSize = parseInt((note as any).__noteData.styles.fontSize);
        const newSize = Math.min(currentSize + 2, 72);
        (note as any).__noteData.styles.fontSize = newSize + 'px';
        applyStyles(note, (note as any).__noteData.styles);
      }
    });
    updateStyles();
    return;
  }
  
  if (ctrlKey && e.key === '-' && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    selectedNotes.forEach(note => {
      if ((note as any).__noteData) {
        const currentSize = parseInt((note as any).__noteData.styles.fontSize);
        const newSize = Math.max(currentSize - 2, 8);
        (note as any).__noteData.styles.fontSize = newSize + 'px';
        applyStyles(note, (note as any).__noteData.styles);
      }
    });
    updateStyles();
    return;
  }
  
  // Handle arrow keys to move selected notes
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    const moveDistance = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    
    switch (e.key) {
      case 'ArrowUp': dy = -moveDistance; break;
      case 'ArrowDown': dy = moveDistance; break;
      case 'ArrowLeft': dx = -moveDistance; break;
      case 'ArrowRight': dx = moveDistance; break;
    }
    
    selectedNotes.forEach(note => {
      const x = parseInt(note.style.left) + dx;
      const y = parseInt(note.style.top) + dy;
      note.style.left = Math.max(0, x) + 'px';
      note.style.top = Math.max(0, y) + 'px';
    });
    
    updateSelection();
    saveCurrentDocument();
    return;
  }
  
  // Handle copy selected notes
  if (ctrlKey && e.key.toLowerCase() === 'c' && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    const notesData = Array.from(selectedNotes).map(note => ({
      x: parseInt(note.style.left),
      y: parseInt(note.style.top),
      html: note.innerHTML,
      styles: (note as any).__noteData ? (note as any).__noteData.styles : {} as NoteStyles
    }));
    
    // Store in localStorage since clipboard API requires HTTPS
    localStorage.setItem('anywhereClipboard', JSON.stringify(notesData));
    return;
  }
  
  // Handle paste notes
  if (ctrlKey && e.key.toLowerCase() === 'v' && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    const clipboardData = localStorage.getItem('anywhereClipboard');
    if (clipboardData) {
      try {
        const notesData = JSON.parse(clipboardData);
        saveToHistory();
        
        selectedNotes.clear();
        const offset = 30;
        
        notesData.forEach((noteData: any) => {
          const note = document.createElement('div');
          note.className = 'note';
          note.contentEditable = currentTool === 'default' ? 'true' : 'false';
          note.style.left = (noteData.x + offset) + 'px';
          note.style.top = (noteData.y + offset) + 'px';
          note.innerHTML = noteData.html;
          
          const noteObj: NoteObject = {
            el: note,
            styles: { ...noteData.styles }
          };
          
          applyStyles(note, noteData.styles);
          canvas.appendChild(note);
          setupNote(note, noteObj);
          selectedNotes.add(note);
        });
        
        updateSelection();
        saveCurrentDocument();
      } catch (e) {
        console.warn('Failed to paste notes:', e);
      }
    }
    return;
  }
  
  // Handle selected notes deletion
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    // Save state before deletion
    saveToHistory();
    selectedNotes.forEach(note => note.remove());
    selectedNotes.clear();
    updateSelection();
    saveCurrentDocument();
    return;
  }
  
  // Handle Ctrl+A to select all notes
  if (ctrlKey && e.key.toLowerCase() === 'a' && !(document.activeElement as HTMLElement).classList.contains('note')) {
    e.preventDefault();
    selectedNotes.clear();
    canvas.querySelectorAll<HTMLDivElement>('.note').forEach(note => selectedNotes.add(note));
    updateSelection();
    return;
  }
  
  // Existing shortcuts for active note
  if (ctrlKey && currentNote && (document.activeElement as HTMLElement).classList.contains('note')) {
    switch (e.key.toLowerCase()) {
      case 'e':
        e.preventDefault();
        ($('alignCenter') as HTMLButtonElement).click();
        break;
      case 'l':
        e.preventDefault();
        ($('alignLeft') as HTMLButtonElement).click();
        break;
      case 'r':
        e.preventDefault();
        ($('alignRight') as HTMLButtonElement).click();
        break;
    }
  }
  
  // Keyboard shortcuts for selected notes (when no note is being edited)
  if (ctrlKey && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        ($('bold') as HTMLButtonElement).click();
        break;
      case 'i':
        e.preventDefault();
        ($('italic') as HTMLButtonElement).click();
        break;
      case 'u':
        e.preventDefault();
        ($('underline') as HTMLButtonElement).click();
        break;
      case 'e':
        e.preventDefault();
        ($('alignCenter') as HTMLButtonElement).click();
        break;
      case 'l':
        e.preventDefault();
        ($('alignLeft') as HTMLButtonElement).click();    
        break;
      case 'r':
        e.preventDefault();
        ($('alignRight') as HTMLButtonElement).click();
        break;
    }
  }
  
  // List keyboard shortcuts
  if (ctrlKey && e.shiftKey && selectedNotes.size > 0 && !(document.activeElement as HTMLElement).classList.contains('note')) {
    switch (e.key) {
      case '*':
      case '8':
        e.preventDefault();
        ($('bulletList') as HTMLButtonElement).click();
        break;
      case '&':
      case '7':
        e.preventDefault();
        ($('numberedList') as HTMLButtonElement).click();
        break;
    }
  }
});

// Prevent context menu on middle mouse button
canvas.addEventListener('contextmenu', e => {
  if (e.button === 1 || isPanning) {
    e.preventDefault();
  }
});

// Global keyboard shortcuts - keyup
document.addEventListener('keyup', e => {
  // Handle spacebar release for pan mode
  if (e.key === ' ' && isSpacebarDown) {
    isSpacebarDown = false;
    document.body.classList.remove('pan-active', 'panning');
    isPanning = false;
  }
});

// Initialize
loadTheme();
loadSettings();
loadDocuments();
initHeaderAutoHide();
updateCanvasClasses(); // Initialize tool state