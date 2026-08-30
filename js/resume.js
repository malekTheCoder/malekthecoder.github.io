// Resume page: click a rendered page to view it full size.
//
// The pages are SVGs rendered from the PDF by scripts/render_resume.py rather than an embedded
// <object>. Mobile Safari and Firefox render embedded PDFs badly or not at all, and the ones
// that do wrap it in viewer chrome. An image renders identically everywhere and stays crisp.

const sheets = [...document.querySelectorAll('.resume-sheet')];
const viewer = document.getElementById('resumeViewer');
const body   = document.getElementById('resumeViewerBody');
const closeB = document.getElementById('resumeViewerClose');

if (sheets.length && viewer && body) {
  let lastFocus = null;

  function open(page) {
    const src = document.querySelector(`.resume-sheet[data-page="${page}"] img`).src;
    body.innerHTML = '';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Resume, page ${page}`;
    img.className = 'resume-viewer-img';
    body.appendChild(img);

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

  sheets.forEach(s => s.addEventListener('click', () => open(s.dataset.page)));
  closeB.addEventListener('click', close);

  // Backdrop closes; the page image itself does not.
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
