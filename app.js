(() => {
  'use strict';

  const STORAGE_KEY = 'anywhereDocuments';
  const THEME_KEY = 'darkMode';
  const SAVE_DELAY = 300;

  let docs = {};
  let currentDocId = null;
  let currentNote = null;
  let saveTimer = null;

  // --- Persistence ---

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate from old format: strip extra fields, keep x/y/html
        for (const id in parsed) {
          const doc = parsed[id];
          docs[id] = {
            id: doc.id,
            title: doc.title || 'Untitled',
            notes: (doc.notes || []).map(n => ({ x: n.x, y: n.y, html: n.html || n.text || '' }))
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load documents', e);
    }
    if (!Object.keys(docs).length) newDoc();
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // Serialize current canvas state
      if (currentDocId && docs[currentDocId]) {
        docs[currentDocId].notes = serializeNotes();
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      } catch (e) {
        console.warn('Failed to save', e);
      }
    }, SAVE_DELAY);
  }

  function serializeNotes() {
    const notes = [];
    document.querySelectorAll('.note').forEach(el => {
      notes.push({
        x: parseInt(el.style.left) || 0,
        y: parseInt(el.style.top) || 0,
        html: el.innerHTML
      });
    });
    return notes;
  }

  // --- Documents ---

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function newDoc() {
    const id = genId();
    docs[id] = { id, title: 'Untitled', notes: [] };
    loadDoc(id);
    renderSidebar();
    save();
  }

  function loadDoc(id) {
    // Save current doc before switching
    if (currentDocId && docs[currentDocId]) {
      docs[currentDocId].notes = serializeNotes();
    }
    currentDocId = id;
    currentNote = null;
    const canvas = document.getElementById('canvas');
    // Remove existing notes
    canvas.querySelectorAll('.note').forEach(el => el.remove());
    // Show/hide logo
    const logo = document.getElementById('logo');
    const doc = docs[id];
    if (!doc) return;
    if (doc.notes.length === 0) {
      logo.style.display = '';
    } else {
      logo.style.display = 'none';
      doc.notes.forEach(n => createNote(n.x, n.y, n.html));
    }
    renderSidebar();
  }

  function deleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    delete docs[id];
    if (currentDocId === id) {
      const ids = Object.keys(docs);
      if (ids.length) {
        loadDoc(ids[0]);
      } else {
        newDoc();
      }
    }
    renderSidebar();
    save();
  }

  function autoTitle() {
    if (!currentDocId || !docs[currentDocId]) return;
    const firstNote = document.querySelector('.note');
    if (firstNote) {
      const text = firstNote.textContent.trim();
      docs[currentDocId].title = text.slice(0, 40) || 'Untitled';
    } else {
      docs[currentDocId].title = 'Untitled';
    }
    renderSidebar();
  }

  // --- Sidebar ---

  function renderSidebar() {
    const list = document.getElementById('notesList');
    const search = document.getElementById('searchInput').value.toLowerCase();
    list.innerHTML = '';
    const sorted = Object.values(docs).sort((a, b) => {
      // Sort by id descending (newest first since id is timestamp-based)
      return b.id.localeCompare(a.id);
    });
    sorted.forEach(doc => {
      if (search && !doc.title.toLowerCase().includes(search)) return;
      const item = document.createElement('div');
      item.className = 'doc-item' + (doc.id === currentDocId ? ' active' : '');
      const title = document.createElement('span');
      title.className = 'doc-title';
      title.textContent = doc.title;
      title.addEventListener('click', () => loadDoc(doc.id));
      const del = document.createElement('button');
      del.className = 'doc-delete';
      del.textContent = '\u00d7';
      del.addEventListener('click', e => { e.stopPropagation(); deleteDoc(doc.id); });
      item.appendChild(title);
      item.appendChild(del);
      list.appendChild(item);
    });
  }

  // --- Notes ---

  function createNote(x, y, html) {
    const logo = document.getElementById('logo');
    logo.style.display = 'none';

    const note = document.createElement('div');
    note.className = 'note';
    note.contentEditable = 'true';
    note.style.left = x + 'px';
    note.style.top = y + 'px';
    if (html) note.innerHTML = html;

    setupDrag(note);

    note.addEventListener('input', () => {
      autoTitle();
      save();
    });

    note.addEventListener('focus', () => {
      currentNote = note;
    });

    note.addEventListener('blur', () => {
      // Remove empty notes
      if (!note.textContent.trim() && !note.querySelector('img')) {
        note.remove();
        autoTitle();
        save();
      }
    });

    note.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic');
      }
    });

    document.getElementById('canvas').appendChild(note);
    note.focus();
    currentNote = note;
    return note;
  }

  function setupDrag(note) {
    let startX, startY, noteX, noteY, dragging = false, moved = false;

    note.addEventListener('mousedown', e => {
      if (e.target !== note && e.target.closest('.note') === note) {
        // Clicked inside note content (e.g. bold text span) — allow editing
      }
      startX = e.clientX;
      startY = e.clientY;
      noteX = parseInt(note.style.left) || 0;
      noteY = parseInt(note.style.top) || 0;
      dragging = false;
      moved = false;

      const onMove = e2 => {
        const dx = e2.clientX - startX;
        const dy = e2.clientY - startY;
        if (!dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          dragging = true;
          note.contentEditable = 'false';
          note.style.cursor = 'grabbing';
          note.style.userSelect = 'none';
        }
        if (dragging) {
          moved = true;
          note.style.left = (noteX + dx) + 'px';
          note.style.top = (noteY + dy) + 'px';
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (dragging) {
          note.contentEditable = 'true';
          note.style.cursor = '';
          note.style.userSelect = '';
          save();
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // --- Touch support ---

  function touchToMouse(type) {
    return e => {
      if (e.touches.length > 1) return;
      const t = e.touches[0] || e.changedTouches[0];
      const mouse = new MouseEvent(type, {
        clientX: t.clientX,
        clientY: t.clientY,
        bubbles: true
      });
      t.target.dispatchEvent(mouse);
      if (type !== 'mouseup') e.preventDefault();
    };
  }

  // --- Theme ---

  function initTheme() {
    const isDark = localStorage.getItem(THEME_KEY) === 'true';
    if (isDark) document.body.classList.add('dark');
    updateThemeIcon();
  }

  function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem(THEME_KEY, isDark.toString());
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDark = document.body.classList.contains('dark');
    document.getElementById('sunIcon').style.display = isDark ? 'none' : '';
    document.getElementById('moonIcon').style.display = isDark ? '' : 'none';
    document.getElementById('themeText').textContent = isDark ? 'Dark Mode' : 'Light Mode';
  }

  // --- Init ---

  function init() {
    initTheme();
    load();

    const canvas = document.getElementById('canvas');
    const sidebar = document.getElementById('sidebar');

    // Load first doc
    const ids = Object.keys(docs);
    if (ids.length) loadDoc(ids[ids.length - 1]);

    // Canvas click → new note
    canvas.addEventListener('click', e => {
      if (e.target !== canvas && e.target.id !== 'logo' && e.target.id !== 'logo-subtext') return;
      const rect = canvas.getBoundingClientRect();
      createNote(e.clientX - rect.left, e.clientY - rect.top, '');
    });

    // Sidebar buttons
    document.getElementById('newNote').addEventListener('click', () => newDoc());
    document.getElementById('searchInput').addEventListener('input', () => renderSidebar());
    document.getElementById('searchBtn').addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      const visible = getComputedStyle(input).display !== 'none';
      input.style.display = visible ? 'none' : 'block';
      if (!visible) input.focus();
    });
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Sidebar collapse/expand
    document.getElementById('libraryBtn').addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    // Touch support
    canvas.addEventListener('touchstart', touchToMouse('mousedown'), { passive: false });
    canvas.addEventListener('touchmove', touchToMouse('mousemove'), { passive: false });
    canvas.addEventListener('touchend', touchToMouse('mouseup'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
