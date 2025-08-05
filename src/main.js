let currentNote=null,currentDocId='',documents={},hasTyped=false;
const $=id=>document.getElementById(id),
toolbar=$('toolbar'),logo=$('logo'),canvas=$('canvas'),
sidebar=$('sidebar'),notesList=$('notesList'),
searchInput=$('searchInput'),themeText=$('themeText');

function loadTheme(){
  const isDark=localStorage.getItem('darkMode')==='true';
  document.body.classList.toggle('dark',isDark);
  themeText.textContent=isDark?'Dark Mode':'Light Mode';
}

function loadDocuments(){
  const saved=localStorage.getItem('anywhereDocuments');
  if(saved)documents=JSON.parse(saved);
  if(!Object.keys(documents).length)createNewDocument();
  else{
    currentDocId=Object.keys(documents)[0];
    loadDocument(currentDocId);
  }
  updateNotesList();
}

function saveDocuments(){
  localStorage.setItem('anywhereDocuments',JSON.stringify(documents));
}

function createNewDocument(){
  const id=Date.now()+'',noteCount=Object.keys(documents).length+1;
  documents[id]={id,title:`Note #${noteCount}`,notes:[],pinned:false};
  currentDocId=id;
  clearCanvas();
  saveDocuments();
  updateNotesList();
}

function clearCanvas(){
  canvas.querySelectorAll('.note').forEach(n=>n.remove());
  logo.classList.remove('tl');
  hasTyped=false;
}

function loadDocument(id){
  clearCanvas();
  const doc=documents[id];
  if(!doc)return;
  currentDocId=id;
  if(doc.notes.length){
    logo.classList.add('tl');
    hasTyped=true;
  }
  doc.notes.forEach(noteData=>{
    const note=document.createElement('div');
    note.className='note';
    note.contentEditable='true';
    note.style.left=noteData.x+'px';
    note.style.top=noteData.y+'px';
    note.textContent=noteData.text;
    const noteObj={el:note,styles:{...noteData.styles}};
    applyStyles(note,noteData.styles);
    canvas.appendChild(note);
    setupNote(note,noteObj);
  });
  updateNotesList();
}

function saveCurrentDocument(){
  if(!currentDocId)return;
  const notes=Array.from(canvas.querySelectorAll('.note')).map(note=>{
    const noteData=note.__noteData;
    return{
      x:parseInt(note.style.left),
      y:parseInt(note.style.top),
      text:note.textContent||'',
      styles:noteData?noteData.styles:{
        bold:false,italic:false,underline:false,strike:false,
        fontSize:'16px',fontFamily:'-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif'
      }
    };
  });
  documents[currentDocId].notes=notes;
  saveDocuments();
}

function updateNotesList(){
  notesList.innerHTML='';
  const docs=Object.values(documents)
    .filter(doc=>doc.title.toLowerCase().includes(searchInput.value.toLowerCase()));
  const pinned=docs.filter(d=>d.pinned);
  const unpinned=docs.filter(d=>!d.pinned);
  if(pinned.length){
    const section=document.createElement('div');
    section.className='pinned-section';
    const title=document.createElement('div');
    title.className='pinned-title';
    title.textContent='Pinned';
    section.appendChild(title);
    pinned.forEach(doc=>section.appendChild(createNoteItem(doc)));
    notesList.appendChild(section);
  }
  unpinned.forEach(doc=>notesList.appendChild(createNoteItem(doc)));
}

function createNoteItem(doc){
  const item=document.createElement('div');
  item.className='note-item';
  if(doc.id===currentDocId)item.classList.add('active');
  const text=document.createElement('span');
  text.textContent=doc.title;
  text.onclick=()=>loadDocument(doc.id);
  item.appendChild(text);
  const actions=document.createElement('div');
  actions.className='note-actions';
  const pinBtn=document.createElement('button');
  pinBtn.innerHTML=`<svg viewBox="0 0 24 24" fill="${doc.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="2">
    <path d="M12 2L9 9H2l6 4-2 7 6-5 6 5-2-7 6-4h-7z"/>
  </svg>`;
  pinBtn.onclick=e=>{
    e.stopPropagation();
    doc.pinned=!doc.pinned;
    saveDocuments();
    updateNotesList();
  };
  const editBtn=document.createElement('button');
  editBtn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
  editBtn.onclick=e=>{
    e.stopPropagation();
    const newTitle=prompt('Rename note:',doc.title);
    if(newTitle&&newTitle.trim()){
      doc.title=newTitle.trim();
      saveDocuments();
      updateNotesList();
    }
  };
  const delBtn=document.createElement('button');
  delBtn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`;
  delBtn.onclick=e=>{
    e.stopPropagation();
    if(confirm('Delete this note?')){
      delete documents[doc.id];
      if(doc.id===currentDocId){
        const remaining=Object.keys(documents);
        if(remaining.length){
          loadDocument(remaining[0]);
        }else{
          createNewDocument();
        }
      }
      saveDocuments();
      updateNotesList();
    }
  };
  actions.appendChild(pinBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  item.appendChild(actions);
  return item;
}

function setupNote(note,noteObj){
  note.__noteData=noteObj;
  note.addEventListener('focus',()=>{
    currentNote=noteObj;
    toolbar.classList.add('show');
    updateToolbar();
  });
  note.addEventListener('blur',()=>{
    if(!note.textContent)note.remove();
    saveCurrentDocument();
  });
  note.addEventListener('input',()=>{
    if(!hasTyped&&note.textContent?.length){
      hasTyped=true;
      logo.classList.add('tl');
    }
    saveCurrentDocument();
  });
}

function applyStyles(el,styles){
  el.style.fontWeight=styles.bold?'bold':'normal';
  el.style.fontStyle=styles.italic?'italic':'normal';
  el.style.textDecoration=(styles.underline?'underline ':'')+(styles.strike?'line-through':'');
  el.style.fontSize=styles.fontSize;
  el.style.fontFamily=styles.fontFamily;
}

canvas.addEventListener('click',e=>{
  if(e.target.classList.contains('note')||e.target===logo)return;
  const note=document.createElement('div');
  note.className='note';
  note.contentEditable='true';
  note.style.left=(e.clientX-canvas.offsetLeft)+'px';
  note.style.top=e.clientY+'px';
  const noteObj={
    el:note,
    styles:{
      bold:false,italic:false,underline:false,strike:false,
      fontSize:'16px',fontFamily:'-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif'
    }
  };
  canvas.appendChild(note);
  setupNote(note,noteObj);
  note.focus();
});

document.addEventListener('click',e=>{
  if(!toolbar.contains(e.target)&&!e.target.classList.contains('note')&&
     document.activeElement?.classList.contains('note')===false){
    toolbar.classList.remove('show');
  }
});

let isDragging=false,dragStartX=0,dragStartY=0,toolbarStartX=0,toolbarStartY=0;
toolbar.addEventListener('mousedown',e=>{
  const tag=e.target.tagName;
  if(tag!=='BUTTON'&&tag!=='SELECT'&&tag!=='OPTION'){
    isDragging=true;
    dragStartX=e.clientX;
    dragStartY=e.clientY;
    const rect=toolbar.getBoundingClientRect();
    toolbarStartX=rect.left+rect.width/2;
    toolbarStartY=rect.top;
    toolbar.style.cursor='grabbing';
  }
});

document.addEventListener('mousemove',e=>{
  if(isDragging){
    toolbar.style.left=(toolbarStartX+e.clientX-dragStartX)+'px';
    toolbar.style.top=(toolbarStartY+e.clientY-dragStartY)+'px';
    toolbar.style.transform='none';
  }
});

document.addEventListener('mouseup',()=>{
  isDragging=false;
  toolbar.style.cursor='move';
});

function updateStyles(){
  if(!currentNote)return;
  applyStyles(currentNote.el,currentNote.styles);
  saveCurrentDocument();
}

function updateToolbar(){
  if(!currentNote)return;
  const s=currentNote.styles;
  $('bold').classList.toggle('active',s.bold);
  $('italic').classList.toggle('active',s.italic);
  $('underline').classList.toggle('active',s.underline);
  $('strike').classList.toggle('active',s.strike);
  $('fontSize').value=s.fontSize;
  $('fontFamily').value=s.fontFamily;
}

['bold','italic','underline','strike'].forEach(id=>{
  $(id).addEventListener('click',e=>{
    e.stopPropagation();
    if(!currentNote)return;
    currentNote.styles[id]=!currentNote.styles[id];
    updateStyles();
    updateToolbar();
    currentNote.el.focus();
  });
});

$('fontSize').addEventListener('change',e=>{
  e.stopPropagation();
  if(!currentNote)return;
  currentNote.styles.fontSize=e.target.value;
  updateStyles();
  currentNote.el.focus();
});

$('fontFamily').addEventListener('change',e=>{
  e.stopPropagation();
  if(!currentNote)return;
  currentNote.styles.fontFamily=e.target.value;
  updateStyles();
  currentNote.el.focus();
});

$('newNote').addEventListener('click',createNewDocument);
$('searchBtn').addEventListener('click',()=>{
  sidebar.classList.toggle('exp');
  if(sidebar.classList.contains('exp'))searchInput.focus();
});
$('libraryBtn').addEventListener('click',()=>sidebar.classList.toggle('exp'));
$('themeToggle').addEventListener('click',()=>{
  const isDark=document.body.classList.toggle('dark');
  localStorage.setItem('darkMode',isDark+'');
  themeText.textContent=isDark?'Dark Mode':'Light Mode';
});
searchInput.addEventListener('input',updateNotesList);

toolbar.addEventListener('mousedown',e=>{
  const tag=e.target.tagName;
  if(tag==='BUTTON'||tag==='SELECT')e.preventDefault();
});

loadTheme();
loadDocuments(); 