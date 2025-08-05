// State management
let currentNote = null;
let currentDocId = '';
let documents = {};
let hasTyped = false;
let selectedNotes = new Set();
let isSelecting = false;
let selectBox = null;
let startX = 0;
let startY = 0;
let isDraggingGroup = false;
let dragHandle = null;
let justCompletedSelection = false;

// Header auto-hide system
let headerIdleTimer = null;
let headerIdleTimeout = 10000; // 10 seconds default
let headerCanHide = true;

// Undo/Redo system
let documentHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// DOM elements
const $ = id => document.getElementById(id);
const toolbar = $('toolbar');
const logo = $('logo');
const canvas = $('canvas');
const sidebar = $('sidebar');
const notesList = $('notesList');
const searchInput = $('searchInput');
const themeText = $('themeText');

// Theme management
function loadTheme() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark', isDark);
  themeText.textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

// Settings management
function loadSettings() {
  const saved = localStorage.getItem('anywhereSettings');
  if (saved) {
    const settings = JSON.parse(saved);
    headerIdleTimeout = settings.headerIdleTimeout || 10000;
    headerCanHide = settings.headerCanHide !== false;
  }
}

function saveSettings() {
  const settings = {
    headerIdleTimeout,
    headerCanHide
  };
  localStorage.setItem('anywhereSettings', JSON.stringify(settings));
}

// Header auto-hide system
function resetHeaderTimer() {
  if (!headerCanHide) return;
  
  // Show header
  logo.style.opacity = '1';
  
  // Clear existing timer
  if (headerIdleTimer) {
    clearTimeout(headerIdleTimer);
  }
  
  // Set new timer
  headerIdleTimer = setTimeout(() => {
    if (headerCanHide) {
      logo.style.opacity = '0';
    }
  }, headerIdleTimeout);
}

function initHeaderAutoHide() {
  // Add event listeners for user activity
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetHeaderTimer, true);
  });
  
  // Start the timer
  resetHeaderTimer();
}

// Document management
function loadDocuments() {
  const saved = localStorage.getItem('anywhereDocuments');
  if (saved) documents = JSON.parse(saved);
  
  if (!Object.keys(documents).length) {
    createNewDocument();
  } else {
    currentDocId = Object.keys(documents)[0];
    loadDocument(currentDocId);
  }
  updateNotesList();
}

function saveDocuments() {
  localStorage.setItem('anywhereDocuments', JSON.stringify(documents));
}

function createNewDocument() {
  const id = Date.now() + '';
  const noteCount = Object.keys(documents).length + 1;
  documents[id] = { id, title: `Note #${noteCount}`, notes: [], pinned: false };
  currentDocId = id;
  clearCanvas();
  saveDocuments();
  updateNotesList();
}

function clearCanvas() {
  canvas.querySelectorAll('.note').forEach(n => n.remove());
  logo.classList.remove('tl');
  hasTyped = false;
  selectedNotes.clear();
}

function loadDocument(id) {
  clearCanvas();
  const doc = documents[id];
  if (!doc) return;
  
  currentDocId = id;
  if (doc.notes.length) {
    logo.classList.add('tl');
    hasTyped = true;
  }
  
  doc.notes.forEach(noteData => {
    const note = document.createElement('div');
    note.className = 'note';
    note.contentEditable = 'true';
    note.style.left = noteData.x + 'px';
    note.style.top = noteData.y + 'px';
    note.style.textAlign = noteData.styles.align || 'left';
    note.innerHTML = noteData.html || noteData.text || '';
    
    const noteObj = {
      el: note,
      styles: { ...noteData.styles, align: noteData.styles.align || 'left' }
    };
    
    applyStyles(note, noteData.styles);
    canvas.appendChild(note);
    setupNote(note, noteObj);
  });
  
  updateNotesList();
}

function saveCurrentDocument() {
  if (!currentDocId) return;
  
  const notes = Array.from(canvas.querySelectorAll('.note')).map(note => {
    const noteData = note.__noteData;
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
  saveDocuments();
}

// Undo/Redo system functions
function saveToHistory() {
  if (!currentDocId) return;
  
  // Create a deep copy of the current document state
  const currentState = {
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

function undo() {
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

function redo() {
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
function updateNotesList() {
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

function createNoteItem(doc) {
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
    if (e.target.closest('.note-actions')) return;
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
  function startInlineEdit() {
    const input = document.createElement('input');
    input.value = doc.title;
    input.onblur = () => {
      if (input.value.trim()) {
        doc.title = input.value.trim();
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

function showDeleteModal(doc) {
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
  
  modal.querySelector('.cancel').onclick = () => modal.remove();
  modal.querySelector('.confirm').onclick = () => {
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

function showSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content settings-modal">
      <h3>Settings</h3>
      
      <div class="setting-group">
        <label for="idleTimeSlider">Header idle time: <span id="idleTimeValue">${headerIdleTimeout / 1000}s</span></label>
        <input type="range" id="idleTimeSlider" min="5" max="60" value="${headerIdleTimeout / 1000}" step="1">
      </div>
      
      <div class="setting-group">
        <label>
          <input type="checkbox" id="headerToggle" ${headerCanHide ? 'checked' : ''}>
          Allow header to auto-hide
        </label>
      </div>
      
      <div class="setting-group">
        <button class="delete-all-btn" id="deleteAllNotes">Delete All Notes</button>
      </div>
      
      <div class="modal-buttons">
        <button class="cancel">Cancel</button>
        <button class="confirm">Save</button>
      </div>
    </div>
  `;
  
  const idleTimeSlider = modal.querySelector('#idleTimeSlider');
  const idleTimeValue = modal.querySelector('#idleTimeValue');
  const headerToggle = modal.querySelector('#headerToggle');
  
  // Update slider value display
  idleTimeSlider.oninput = () => {
    idleTimeValue.textContent = idleTimeSlider.value + 's';
  };
  
  modal.querySelector('.cancel').onclick = () => modal.remove();
  
  modal.querySelector('.confirm').onclick = () => {
    // Save settings
    headerIdleTimeout = parseInt(idleTimeSlider.value) * 1000;
    headerCanHide = headerToggle.checked;
    saveSettings();
    
    // Reset header visibility based on new settings
    if (headerCanHide) {
      resetHeaderTimer();
    } else {
      if (headerIdleTimer) {
        clearTimeout(headerIdleTimer);
      }
      logo.style.opacity = '1';
    }
    
    modal.remove();
  };
  
  modal.querySelector('#deleteAllNotes').onclick = () => {
    modal.remove();
    showDeleteAllModal();
  };
  
  document.body.appendChild(modal);
}

function showDeleteAllModal() {
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
  
  modal.querySelector('.cancel').onclick = () => modal.remove();
  modal.querySelector('.confirm').onclick = () => {
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
function setupNote(note, noteObj) {
  note.__noteData = noteObj;
  
  note.addEventListener('mousedown', e => {
    // Use position-based detection to determine if click is over actual text content
    const hasExistingSelection = window.getSelection().toString();
    
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
    
    // If clicking over text content, allow natural text selection
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
    currentNote = noteObj;
    toolbar.classList.add('show');
    updateToolbar();
  });
  
  note.addEventListener('blur', () => {
    if (!note.innerHTML.trim()) note.remove();
    saveCurrentDocument();
  });
  
  note.addEventListener('input', () => {
    if (!hasTyped && note.textContent?.length) {
      hasTyped = true;
      logo.classList.add('tl');
    }
    saveCurrentDocument();
  });
  
  note.addEventListener('mouseup', () => {
    // Show toolbar when text is selected
    if (window.getSelection().toString()) {
      currentNote = noteObj;
      toolbar.classList.add('show');
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
function updateSelection() {
  canvas.querySelectorAll('.note').forEach(n => {
    n.classList.toggle('selected', selectedNotes.has(n));
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
    
    toolbar.classList.add('show');
    updateToolbar();
  } else if (selectedNotes.size === 1) {
    const note = Array.from(selectedNotes)[0];
    currentNote = note.__noteData;
    toolbar.classList.add('show');
    updateToolbar();
  } else {
    toolbar.classList.remove('show');
  }
}

// Styling functions
function applyStyles(el, styles) {
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

function updateStyles() {
  if (selectedNotes.size > 1) {
    selectedNotes.forEach(note => {
      if (note.__noteData) {
        applyStyles(note, note.__noteData.styles);
      }
    });
  } else if (currentNote) {
    applyStyles(currentNote.el, currentNote.styles);
  }
  saveCurrentDocument();
}

function toggleBulletList() {
  const sel = window.getSelection();
  if (sel.toString() && sel.rangeCount) {
    // Text is selected - apply to selection
    document.execCommand('insertUnorderedList');
    saveCurrentDocument();
  } else if (selectedNotes.size > 1) {
    // Multiple notes selected
    selectedNotes.forEach(note => {
      if (note.__noteData) {
        const currentListType = note.__noteData.styles.listType;
        const isTogglingOn = currentListType !== 'bullet';
        note.__noteData.styles.listType = isTogglingOn ? 'bullet' : 'none';
        
        // If note is empty and we're turning on list, insert empty list item
        if (isTogglingOn && !note.textContent.trim()) {
          note.innerHTML = '<ul><li></li></ul>';
          // Position cursor in the list item
          const li = note.querySelector('li');
          if (li) {
            li.focus();
            const range = document.createRange();
            range.selectNodeContents(li);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          applyStyles(note, note.__noteData.styles);
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
    if (isTogglingOn && !currentNote.el.textContent.trim()) {
      currentNote.el.innerHTML = '<ul><li></li></ul>';
      // Position cursor in the list item
      const li = currentNote.el.querySelector('li');
      if (li) {
        li.focus();
        const range = document.createRange();
        range.selectNodeContents(li);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      applyStyles(currentNote.el, currentNote.styles);
    }
    updateStyles();
  }
  updateToolbar();
  if (currentNote && selectedNotes.size <= 1) currentNote.el.focus();
}

function toggleNumberedList() {
  const sel = window.getSelection();
  if (sel.toString() && sel.rangeCount) {
    // Text is selected - apply to selection
    document.execCommand('insertOrderedList');
    saveCurrentDocument();
  } else if (selectedNotes.size > 1) {
    // Multiple notes selected
    selectedNotes.forEach(note => {
      if (note.__noteData) {
        const currentListType = note.__noteData.styles.listType;
        const isTogglingOn = currentListType !== 'numbered';
        note.__noteData.styles.listType = isTogglingOn ? 'numbered' : 'none';
        
        // If note is empty and we're turning on list, insert empty list item
        if (isTogglingOn && !note.textContent.trim()) {
          note.innerHTML = '<ol><li></li></ol>';
          // Position cursor in the list item
          const li = note.querySelector('li');
          if (li) {
            li.focus();
            const range = document.createRange();
            range.selectNodeContents(li);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          applyStyles(note, note.__noteData.styles);
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
    if (isTogglingOn && !currentNote.el.textContent.trim()) {
      currentNote.el.innerHTML = '<ol><li></li></ol>';
      // Position cursor in the list item
      const li = currentNote.el.querySelector('li');
      if (li) {
        li.focus();
        const range = document.createRange();
        range.selectNodeContents(li);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      applyStyles(currentNote.el, currentNote.styles);
    }
    updateStyles();
  }
  updateToolbar();
  if (currentNote && selectedNotes.size <= 1) currentNote.el.focus();
}

function updateToolbar() {
  if (selectedNotes.size > 1) {
    const firstNote = Array.from(selectedNotes)[0].__noteData;
    if (firstNote) {
      const s = firstNote.styles;
      // Show formatting buttons for multi-selection too
      $('bold').classList.toggle('active', s.bold);
      $('italic').classList.toggle('active', s.italic);
      $('underline').classList.toggle('active', s.underline);
      $('strike').classList.toggle('active', s.strike);
      $('alignLeft').classList.toggle('active', s.align === 'left');
      $('alignCenter').classList.toggle('active', s.align === 'center');
      $('alignRight').classList.toggle('active', s.align === 'right');
      $('bulletList').classList.toggle('active', s.listType === 'bullet');
      $('numberedList').classList.toggle('active', s.listType === 'numbered');
      $('fontSize').value = s.fontSize;
      $('fontFamily').value = s.fontFamily;
    }
  } else if (currentNote) {
    const s = currentNote.styles;
    $('bold').classList.toggle('active', s.bold);
    $('italic').classList.toggle('active', s.italic);
    $('underline').classList.toggle('active', s.underline);
    $('strike').classList.toggle('active', s.strike);
    $('alignLeft').classList.toggle('active', s.align === 'left');
    $('alignCenter').classList.toggle('active', s.align === 'center');
    $('alignRight').classList.toggle('active', s.align === 'right');
    $('bulletList').classList.toggle('active', s.listType === 'bullet');
    $('numberedList').classList.toggle('active', s.listType === 'numbered');
    $('fontSize').value = s.fontSize;
    $('fontFamily').value = s.fontFamily;
  }
}

// Canvas interactions
canvas.addEventListener('mousedown', e => {
  if (!e.target.classList.contains('note') && e.target !== logo && e.target !== dragHandle) {
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
    
    canvas.querySelectorAll('.note').forEach(note => {
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
    
    // Create new note if clicking on canvas (not logo)
    if (e.target !== logo) {
      // Save state before creating new note
      saveToHistory();
      
      const note = document.createElement('div');
      note.className = 'note';
      note.contentEditable = 'true';
      note.style.left = (e.clientX - canvas.offsetLeft) + 'px';
      note.style.top = e.clientY + 'px';
      
      const noteObj = {
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
  if (!toolbar.contains(e.target) && 
      !e.target.classList.contains('note') &&
      document.activeElement?.classList.contains('note') === false &&
      selectedNotes.size === 0) {
    toolbar.classList.remove('show');
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
    startX = e.clientX;
    startY = e.clientY;
  }
});

document.addEventListener('mouseup', () => {
  isDraggingGroup = false;
  if (isDraggingGroup) saveCurrentDocument();
});

// Toolbar buttons
['bold', 'italic', 'underline', 'strike'].forEach(id => {
  $(id).onclick = () => {
    const sel = window.getSelection();
    if (sel.toString() && sel.rangeCount) {
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
        if (note.__noteData) {
          note.__noteData.styles[id] = !note.__noteData.styles[id];
          applyStyles(note, note.__noteData.styles);
        }
      });
      updateStyles();
    } else if (currentNote) {
      // Single note, no selection
      currentNote.styles[id] = !currentNote.styles[id];
      applyStyles(currentNote.el, currentNote.styles);
      updateStyles();
    }
    updateToolbar();
    if (currentNote && selectedNotes.size <= 1) currentNote.el.focus();
  };
});

['alignLeft', 'alignCenter', 'alignRight'].forEach(align => {
  $(align).onclick = () => {
    const alignValue = align.replace('align', '').toLowerCase();
    if (selectedNotes.size > 1) {
      selectedNotes.forEach(note => {
        if (note.__noteData) {
          note.__noteData.styles.align = alignValue;
          applyStyles(note, note.__noteData.styles);
        }
      });
    } else if (currentNote) {
      currentNote.styles.align = alignValue;
      applyStyles(currentNote.el, currentNote.styles);
    }
    updateStyles();
    updateToolbar();
    if (currentNote && selectedNotes.size <= 1) currentNote.el.focus();
  };
});

// List buttons
$('bulletList').onclick = toggleBulletList;
$('numberedList').onclick = toggleNumberedList;

$('fontSize').onchange = () => {
  const size = $('fontSize').value;
  const sel = window.getSelection();
  
  if (sel.toString() && sel.rangeCount) {
    // Apply to selected text
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = size;
    try {
      range.surroundContents(span);
    } catch (e) {
      document.execCommand('fontSize', false, '7');
      const fontElements = currentNote.el.getElementsByTagName('font');
      for (let font of fontElements) {
        if (font.size === '7') {
          font.removeAttribute('size');
          font.style.fontSize = size;
        }
      }
    }
    saveCurrentDocument();
  } else if (selectedNotes.size > 1) {
    selectedNotes.forEach(note => {
      if (note.__noteData) {
        note.__noteData.styles.fontSize = size;
        applyStyles(note, note.__noteData.styles);
      }
    });
    updateStyles();
  } else if (currentNote) {
    currentNote.styles.fontSize = size;
    applyStyles(currentNote.el, currentNote.styles);
    updateStyles();
  }
  if (currentNote && selectedNotes.size <= 1) currentNote.el.focus();
};

$('fontFamily').onchange = () => {
  const font = $('fontFamily').value;
  const sel = window.getSelection();
  
  if (sel.toString() && sel.rangeCount) {
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
      if (note.__noteData) {
        note.__noteData.styles.fontFamily = font;
        applyStyles(note, note.__noteData.styles);
      }
    });
    updateStyles();
  } else if (currentNote) {
    currentNote.styles.fontFamily = font;
    applyStyles(currentNote.el, currentNote.styles);
    updateStyles();
  }
  if (currentNote && selectedNotes.size <= 1) currentNote.el.focus();
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
  localStorage.setItem('darkMode', isDark + '');
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
  
  // Handle Undo/Redo
  if (ctrlKey && e.key.toLowerCase() === 'z' && !document.activeElement.classList.contains('note')) {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  
  // Handle Cmd+N for new document
  if (ctrlKey && e.key.toLowerCase() === 'n' && !document.activeElement.classList.contains('note')) {
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
  if (ctrlKey && e.key.toLowerCase() === 'd' && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
    e.preventDefault();
    saveToHistory();
    const offset = 20;
    selectedNotes.forEach(note => {
      const newNote = note.cloneNode(true);
      const x = parseInt(note.style.left) + offset;
      const y = parseInt(note.style.top) + offset;
      newNote.style.left = x + 'px';
      newNote.style.top = y + 'px';
      
      const noteObj = {
        el: newNote,
        styles: { ...note.__noteData.styles }
      };
      
      canvas.appendChild(newNote);
      setupNote(newNote, noteObj);
    });
    saveCurrentDocument();
    return;
  }
  
  // Handle font size changes with Cmd+Plus/Minus
  if (ctrlKey && (e.key === '=' || e.key === '+') && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
    e.preventDefault();
    selectedNotes.forEach(note => {
      if (note.__noteData) {
        const currentSize = parseInt(note.__noteData.styles.fontSize);
        const newSize = Math.min(currentSize + 2, 72);
        note.__noteData.styles.fontSize = newSize + 'px';
        applyStyles(note, note.__noteData.styles);
      }
    });
    updateStyles();
    return;
  }
  
  if (ctrlKey && e.key === '-' && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
    e.preventDefault();
    selectedNotes.forEach(note => {
      if (note.__noteData) {
        const currentSize = parseInt(note.__noteData.styles.fontSize);
        const newSize = Math.max(currentSize - 2, 8);
        note.__noteData.styles.fontSize = newSize + 'px';
        applyStyles(note, note.__noteData.styles);
      }
    });
    updateStyles();
    return;
  }
  
  // Handle arrow keys to move selected notes
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
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
  if (ctrlKey && e.key.toLowerCase() === 'c' && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
    e.preventDefault();
    const notesData = Array.from(selectedNotes).map(note => ({
      x: parseInt(note.style.left),
      y: parseInt(note.style.top),
      html: note.innerHTML,
      styles: note.__noteData ? note.__noteData.styles : {}
    }));
    
    // Store in localStorage since clipboard API requires HTTPS
    localStorage.setItem('anywhereClipboard', JSON.stringify(notesData));
    return;
  }
  
  // Handle paste notes
  if (ctrlKey && e.key.toLowerCase() === 'v' && !document.activeElement.classList.contains('note')) {
    e.preventDefault();
    const clipboardData = localStorage.getItem('anywhereClipboard');
    if (clipboardData) {
      try {
        const notesData = JSON.parse(clipboardData);
        saveToHistory();
        
        selectedNotes.clear();
        const offset = 30;
        
        notesData.forEach(noteData => {
          const note = document.createElement('div');
          note.className = 'note';
          note.contentEditable = 'true';
          note.style.left = (noteData.x + offset) + 'px';
          note.style.top = (noteData.y + offset) + 'px';
          note.innerHTML = noteData.html;
          
          const noteObj = {
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
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
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
  if (ctrlKey && e.key.toLowerCase() === 'a' && !document.activeElement.classList.contains('note')) {
    e.preventDefault();
    selectedNotes.clear();
    canvas.querySelectorAll('.note').forEach(note => selectedNotes.add(note));
    updateSelection();
    return;
  }
  
  // Existing shortcuts for active note
  if (ctrlKey && currentNote && document.activeElement.classList.contains('note')) {
    switch (e.key.toLowerCase()) {
      case 'e':
        e.preventDefault();
        $('alignCenter').click();
        break;
      case 'l':
        e.preventDefault();
        $('alignLeft').click();
        break;
      case 'r':
        e.preventDefault();
        $('alignRight').click();
        break;
    }
  }
  
  // Keyboard shortcuts for selected notes (when no note is being edited)
  if (ctrlKey && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        $('bold').click();
        break;
      case 'i':
        e.preventDefault();
        $('italic').click();
        break;
      case 'u':
        e.preventDefault();
        $('underline').click();
        break;
      case 'e':
        e.preventDefault();
        $('alignCenter').click();
        break;
      case 'l':
        e.preventDefault();
        $('alignLeft').click();    
        break;
      case 'r':
        e.preventDefault();
        $('alignRight').click();
        break;
    }
  }
  
  // List keyboard shortcuts
  if (ctrlKey && e.shiftKey && selectedNotes.size > 0 && !document.activeElement.classList.contains('note')) {
    switch (e.key) {
      case '*':
      case '8':
        e.preventDefault();
        $('bulletList').click();
        break;
      case '&':
      case '7':
        e.preventDefault();
        $('numberedList').click();
        break;
    }
  }
});

// Initialize
loadTheme();
loadSettings();
loadDocuments();
initHeaderAutoHide();