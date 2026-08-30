// Resume page: view a page full size, and keep the PDF's links working.
//
// The pages are SVGs rendered from the PDF by scripts/render_resume.py rather than an embedded
// <object>. Mobile Safari and Firefox render embedded PDFs badly or not at all, and the ones
// that do wrap it in viewer chrome. Rendering to SVG loses the link annotations though, so the
// page overlays a transparent anchor on each one; the same overlay is rebuilt in the full-size
// view so the links keep working there too.

const sheets = [...document.querySelectorAll('.resume-sheet')];
const viewer = document.getElementById('resumeViewer');
const body   = document.getElementById('resumeViewerBody');
const closeB = document.getElementById('resumeViewerClose');

if (sheets.length && viewer && body) {
  let lastFocus = null;

  function open(sheet) {
    body.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'resume-viewer-page';

    const img = document.createElement('img');
    img.src = sheet.querySelector('img').src;
    img.alt = sheet.querySelector('img').alt;
    img.className = 'resume-viewer-img';
    wrap.appendChild(img);

    // Same anchors, same percentage geometry, so they land correctly at any size.
    sheet.querySelectorAll('.resume-link').forEach(a => wrap.appendChild(a.cloneNode(true)));

    body.appendChild(wrap);

    lastFocus = document.activeElement;
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    closeB.focus();
  }

  function close() {
    if (viewer.hidden) return;
    viewer.hidden = true;
    body.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  sheets.forEach(sheet => {
    sheet.querySelector('.resume-zoom').addEventListener('click', () => open(sheet));
    // Clicking the page itself also enlarges, unless the click landed on one of the links.
    sheet.addEventListener('click', e => {
      if (e.target.closest('.resume-link') || e.target.closest('.resume-zoom')) return;
      open(sheet);
    });
  });

  closeB.addEventListener('click', close);
  viewer.addEventListener('click', e => {
    if (e.target === viewer || e.target === body) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}

// Download feedback. A download gives no visible signal on its own: the file lands in a folder the
// reader may not have open, so the click can feel like nothing happened. Swapping the label for a
// moment confirms it fired.
const dl = document.getElementById('resumeDownload');
if (dl) {
  const original = dl.innerHTML;
  let timer = null;

  dl.addEventListener('click', () => {
    clearTimeout(timer);
    dl.classList.add('is-done');
    dl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M20 6 9 17l-5-5"/></svg> Downloaded';
    timer = setTimeout(() => {
      dl.classList.remove('is-done');
      dl.innerHTML = original;
    }, 2400);
  });
}

// Phones get the PDF itself, not a copy of it filed away. iOS and Android both open a PDF in their
// own viewer, and that viewer already carries a share control, so the tap only has to land there.
// A new tab is a desktop nicety and some in-app browsers drop the request on the floor, so on touch
// the PDF links navigate in place instead.
if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
  document.querySelectorAll('a[href$=".pdf"]').forEach(a => {
    a.removeAttribute('target');
    a.removeAttribute('rel');
  });
}
