// Typing animation
const phrases = [
  'Computer Engineering @ GMU',
  'Machine Learning Engineer',
  'Robotics Engineer',
  'Eagle Scout',
];

let phraseIndex = 0;
let charIndex   = 0;
let isDeleting  = false;
const typedEl   = document.getElementById('typed-text');

function typeLoop() {
  if (!typedEl) return;
  const current = phrases[phraseIndex];

  typedEl.textContent = isDeleting
    ? current.slice(0, --charIndex)
    : current.slice(0, ++charIndex);

  let delay = isDeleting ? 45 : 80;

  if (!isDeleting && charIndex === current.length) {
    delay = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    delay = 400;
  }

  setTimeout(typeLoop, delay);
}

typeLoop();



// Navbar — scroll state, active link, name reveal
const navbar   = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');
const navLogo  = document.getElementById('navLogo');
const heroName = document.querySelector('.hero-name');

// Only the home page has a hero for the nav name to hide behind. Everywhere
// else there is nothing to reveal it, so show it straight away.
if (navLogo && !heroName) navLogo.classList.add('visible');

const PAGE = location.pathname.replace(/index\.html$/, '') || '/';

// A nav link is active when it points at the section currently in view. Page
// slugs mirror section ids (/experience/ <-> #experience), so a link to another
// page and a link to a section on this one resolve to the same target name.
function markActiveLink(current) {
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const url = new URL(href, location.origin);
    const onThisPage = (url.pathname.replace(/index\.html$/, '') || '/') === PAGE;
    const target = url.hash ? url.hash.slice(1) : url.pathname.replace(/\//g, '');
    link.classList.toggle('active', onThisPage && target === current);
  });
}

function currentSection() {
  if (!sections.length) return '';
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
  if (atBottom) return sections[sections.length - 1].getAttribute('id');
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.getAttribute('id');
  });
  return current;
}

// Breadcrumb: name the page you're on, and the section within it. The page's
// name comes from whichever nav link points here, so it never drifts from the nav.
const navContext = document.getElementById('navContext');
const navPage    = document.getElementById('navPage');
const navSection = document.getElementById('navSection');

const sectionNames = new Map([...sections].map(sec =>
  [sec.id, sec.querySelector('.section-title')?.textContent.trim() || '']));

const pageLink = [...navLinks].find(l => {
  const u = new URL(l.getAttribute('href') || '', location.origin);
  return !u.hash && (u.pathname.replace(/index\.html$/, '') || '/') === PAGE;
});

if (navContext && navPage && pageLink && PAGE !== '/') {
  navPage.textContent = pageLink.textContent.trim();
  navPage.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  navContext.classList.add('visible');
  navContext.removeAttribute('aria-hidden');
}

function markSection(current) {
  if (!navSection) return;
  const name = sectionNames.get(current) || '';
  // the page's own name already sits to the left; don't say it twice
  const label = (navPage && name === navPage.textContent.trim()) ? '' : name;
  if (navSection.textContent !== label) navSection.textContent = label;
}

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
  if (navLogo && heroName) {
    navLogo.classList.toggle('visible', heroName.getBoundingClientRect().bottom < 72);
  }
  const cur = currentSection();
  markActiveLink(cur);
  markSection(cur);
}, { passive: true });

markActiveLink(currentSection());
markSection(currentSection());


// Hamburger menu
const hamburger  = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinksEl.classList.toggle('open');
  document.body.style.overflow = navLinksEl.classList.contains('open') ? 'hidden' : '';
});

navLinksEl.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinksEl.classList.remove('open');
    document.body.style.overflow = '';
  });
});


// Scroll reveal — only section headers carry [data-animate] now, so there are
// no sibling groups left to stagger. Reveal on sight, no queued delay.
const animatedEls = document.querySelectorAll('[data-animate]');

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px 40px 0px' }
);

animatedEls.forEach(el => observer.observe(el));


// Section rails: the line fills in behind you as you read down a section, and
// each dot lights as the fill reaches it. CSS keeps a rail solid until its
// progress class arrives, so a page without JS still looks finished. Two
// sections run one: Experience, and Education, which labels its stops with
// years but is otherwise identical.

// the track is inset top and bottom by this much (see .timeline::before)
const RAIL_INSET = 8;
// Anything above this line on screen counts as read. Sitting it a little
// past centre means the fill reaches a card about when you start reading it.
const MARK = 0.55;

// Slack around a dot's own threshold. Without it a dot sitting right on the
// mark flips on and off as the page settles under your finger, and its
// colour transition restarts each way, which strobes.
const DOT_HOLD = 8;

function makeRail(railSelector, dotSelector, progressClass) {
  const rail = document.querySelector(railSelector);
  if (!rail) return null;

  const dots = [...rail.querySelectorAll(dotSelector)];

  let dotOffsets = [];   // dot centres, measured down from the rail's top
  let dotLit     = [];
  let lastFill   = -1;
  let lastHeight = -1;
  let ticking    = false;
  // The observer below only ever narrows this. Starting true means a browser
  // that never reports back still gets a working rail, just a busier one.
  let onScreen   = true;

  function measureRail() {
    const top = rail.getBoundingClientRect().top;
    dotOffsets = dots.map(dot => {
      const r = dot.getBoundingClientRect();
      return r.top + r.height / 2 - top;
    });
  }

  // One rect read, then one style write, in that order and nothing in between,
  // so a frame never has to lay the page out twice.
  function updateRail() {
    const rect  = rail.getBoundingClientRect();
    const read  = window.innerHeight * MARK - rect.top;
    const track = Math.max(rect.height - RAIL_INSET * 2, 1);
    const dpr   = window.devicePixelRatio || 1;
    // Snap the tip to a whole device pixel. Left on a fraction it gets
    // re-antialiased every frame and reads as a flickering end to the line.
    const fill = Math.round(Math.min(Math.max(read - RAIL_INSET, 0), track) * dpr) / dpr;

    if (fill !== lastFill) {
      lastFill = fill;
      rail.style.setProperty('--timeline-fill', fill + 'px');
    }

    dots.forEach((dot, i) => {
      const lit = dotLit[i];
      const mark = dotOffsets[i] - (lit ? DOT_HOLD : 0);
      const next = read >= mark;
      if (next === lit) return;
      dotLit[i] = next;
      dot.classList.toggle('is-lit', next);
    });
  }

  // One layout read per frame, and only while the section is anywhere near view
  function onRailScroll() {
    if (!onScreen || ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateRail();
    });
  }

  const railObserver = new IntersectionObserver(
    entries => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) updateRail();
    },
    { rootMargin: '25% 0px' }
  );

  rail.style.setProperty('--timeline-fill', '0px');
  rail.classList.add(progressClass);
  dotLit = dots.map(() => false);
  measureRail();
  updateRail();

  railObserver.observe(rail);

  // Cards reflow as fonts land and as the window narrows; re-measure then too.
  // Only when the height genuinely moved, so a stray callback cannot turn into
  // a measure-every-frame loop.
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      const h = rail.getBoundingClientRect().height;
      if (h === lastHeight) return;
      lastHeight = h;
      measureRail();
      updateRail();
    }).observe(rail);
  }

  return { update: updateRail, measure: measureRail, onScroll: onRailScroll };
}

const rails = [
  makeRail('.timeline', '.timeline-dot', 'timeline--progress'),
  makeRail('.edu-timeline', '.edu-dot', 'edu-timeline--progress'),
].filter(Boolean);

if (rails.length) {
  window.addEventListener('scroll', () => rails.forEach(r => r.onScroll()), { passive: true });
  window.addEventListener('resize', () => rails.forEach(r => { r.measure(); r.update(); }));
}


// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});


// First-visit theme hint
(function () {
  if (localStorage.getItem('theme-hint-shown')) return;
  localStorage.setItem('theme-hint-shown', '1');

  const hint = document.getElementById('themeHint');
  if (!hint) return;

  // Set up SVG path draw-in via stroke-dashoffset
  const paths = hint.querySelectorAll('svg path');
  paths.forEach(p => {
    const len = Math.ceil(p.getTotalLength());
    p.style.strokeDasharray  = len;
    p.style.strokeDashoffset = len;
  });

  // Position hint centered under the dropdown button, clamped to the viewport
  const dropBtn = document.getElementById('themeDropdownBtn');
  if (dropBtn) {
    const r      = dropBtn.getBoundingClientRect();
    const pad    = 12;
    const halfW  = hint.offsetWidth / 2;
    let   center = r.left + r.width / 2;
    center = Math.min(Math.max(center, halfW + pad), window.innerWidth - halfW - pad);
    hint.style.left      = Math.round(center) + 'px';
    hint.style.transform = 'translateX(-50%)';
  }

  // The hint hangs under the nav, and on a phone the hero name sits in exactly that band:
  // roughly 28px of clear space below a 64px nav. Rather than drop the hint on small screens,
  // the hero steps down far enough to open the gap and settles back once the hint goes. Only
  // if even the stepped-down position would collide is the hint skipped.
  const HERO_SHIFT = 56;
  const heroEl = document.querySelector('.hero');
  const nameEl = document.querySelector('.hero-name') || document.querySelector('.hero h1');
  let shifted = false;

  if (nameEl) {
    const hr = hint.getBoundingClientRect();
    const nr = nameEl.getBoundingClientRect();
    const sameColumn = hr.right > nr.left && hr.left < nr.right;
    if (sameColumn && hr.bottom > nr.top - 12) {
      if (!heroEl || hr.bottom > nr.top + HERO_SHIFT - 12) return;
      heroEl.classList.add('is-hint-shifted');
      shifted = true;
    }
  }

  // The scroll cue waits its turn, so the two are not animating at once.
  const cueEl = document.querySelector('.scroll-indicator');
  if (cueEl) cueEl.classList.add('is-waiting');

  let gone = false;
  function dismiss() {
    if (gone) return;
    gone = true;
    hint.classList.remove('is-visible');

    if (shifted) {
      heroEl.classList.remove('is-hint-shifted');
      // One movement at a time: the hero rises back, and only then does the cue arrive.
      if (cueEl) setTimeout(() => cueEl.classList.remove('is-waiting'), 560);
    } else if (cueEl) {
      cueEl.classList.remove('is-waiting');
    }

    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('click', dismiss, true);
  }

  // Dismiss once the reader actually starts scrolling. Measuring the name against the hint
  // does not work on a phone: the two sit within a few dozen pixels of each other at rest, so
  // the condition is already true before any scrolling and the first scroll event kills it.
  const startY = window.scrollY;
  function onScroll() {
    if (window.scrollY > startY + 40) dismiss();
  }

  // The arrow is drawn by 1.9s. Holding it much past that reads as nagging rather than
  // pointing, so it leaves shortly after it finishes rather than sitting out a long timer.
  const APPEAR_AT   = 700;
  const DISMISS_AT  = 3400;

  setTimeout(() => {
    hint.classList.add('is-visible');

    // Draw in: wavy body first, then arrowhead
    if (paths[0]) {
      paths[0].style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)';
      paths[0].style.strokeDashoffset = '0';
    }
    if (paths[1]) {
      paths[1].style.transition = 'stroke-dashoffset 0.25s ease 0.75s';
      paths[1].style.strokeDashoffset = '0';
    }

    document.addEventListener('click', dismiss, true);
    window.addEventListener('scroll', onScroll, { passive: true });
  }, APPEAR_AT);

  setTimeout(dismiss, DISMISS_AT);
})();


// The scroll cue has done its job the moment the reader starts scrolling, so it gets out of
// the way rather than sitting pinned in the hero.
const scrollCue = document.querySelector('.scroll-indicator');
if (scrollCue) {
  let cueTicking = false;
  const syncCue = () => {
    scrollCue.classList.toggle('is-gone', window.scrollY > 40);
    cueTicking = false;
  };
  syncCue();
  window.addEventListener('scroll', () => {
    if (cueTicking) return;
    cueTicking = true;
    requestAnimationFrame(syncCue);
  }, { passive: true });
}



// Projects as an editor window.
//
// The four cards are ordinary markup that already works as a grid, so this only
// reorganises them: an explorer tree and a tab bar are built from the cards, and
// one card shows at a time. With no script the grid is simply what loads. All four
// share one grid cell, so the section is as tall as the tallest project and
// switching never shifts the page underneath the reader.
(function () {
  const grid = document.querySelector('.projects-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.project-card')];
  if (cards.length < 2) return;

  const el = (tag, cls, attrs) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const fileOf  = c => c.dataset.file || c.id.replace('project-', '');
  const groupOf = c => c.dataset.group || '';
  const cardOf  = id => cards.find(c => c.id === id);

  const chevron = '<svg class="proj-chev" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const fileIcon = '<svg class="proj-ficon" viewBox="0 0 12 14" width="11" height="13" aria-hidden="true"><path d="M2 1h5l3 3v9H2zM7 1v3h3" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';

  const win   = el('div', 'proj-window');
  const side  = el('aside', 'proj-side', { 'aria-label': 'Project files' });
  const main  = el('div', 'proj-main');
  const bar   = el('div', 'proj-tabbar', { role: 'tablist', 'aria-label': 'Projects' });
  const crumb = el('div', 'proj-crumb', { 'aria-hidden': 'true' });

  grid.parentNode.insertBefore(win, grid);
  main.append(bar, crumb, grid);
  win.append(side, main);
  grid.classList.add('is-tabs');

  // ---- Explorer: files grouped into folders, in the order the cards appear.
  const head = el('div', 'proj-side-head');
  head.textContent = 'Explorer';
  const root = el('div', 'proj-root');
  root.innerHTML = chevron;
  root.append('projects');
  side.append(head, root);

  const fileBtn = new Map();     // card id -> explorer button
  const folderOf = new Map();    // card id -> { btn, list }
  const setOpen = (f, open) => {
    f.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    f.list.hidden = !open;
  };

  [...new Set(cards.map(groupOf))].forEach(g => {
    const ul = el('ul', 'proj-list');
    let into = ul;
    let folder = null;
    if (g) {
      const btn = el('button', 'proj-folder', { type: 'button', 'aria-expanded': 'true' });
      btn.innerHTML = chevron;
      btn.append(g + '/');
      const list = el('ul', 'proj-list');
      folder = { btn, list };
      btn.addEventListener('click', () => setOpen(folder, btn.getAttribute('aria-expanded') !== 'true'));
      const li = el('li');
      li.append(btn, list);
      ul.appendChild(li);
      into = list;
    }
    cards.filter(c => groupOf(c) === g).forEach(c => {
      const b = el('button', 'proj-file', { type: 'button' });
      b.innerHTML = fileIcon;
      b.append(fileOf(c));
      b.addEventListener('click', () => select(c));
      const li = el('li');
      li.appendChild(b);
      into.appendChild(li);
      fileBtn.set(c.id, b);
      if (folder) folderOf.set(c.id, folder);
    });
    side.appendChild(ul);
  });

  // ---- Tabs, in card order. They can be dragged into a different order.
  const tabFor = new Map();
  const allTabs = () => [...bar.querySelectorAll('.proj-tab')];

  cards.forEach(card => {
    const t = el('div', 'proj-tab', {
      role: 'tab', tabindex: '-1', id: 'tab-' + card.id,
      'aria-controls': card.id, 'aria-selected': 'false',
    });
    t.dataset.for = card.id;
    t.innerHTML = '<span class="proj-tab-dot" aria-hidden="true"></span>';
    t.append(fileOf(card));
    t.addEventListener('click', () => select(card));
    bar.appendChild(t);
    tabFor.set(card.id, t);
  });

  // Keep a tab inside the bar when the bar scrolls sideways (phones). Moves the bar
  // itself and nothing else: scrollIntoView also scrolls the PAGE to reach the tab,
  // and select() runs once on load, which dropped every visitor halfway down.
  // Measured against the bar's own edges because offsetLeft is relative to the
  // nearest positioned ancestor, not the bar, and left the first tab clipped.
  function reveal(t) {
    const br = bar.getBoundingClientRect(), tr = t.getBoundingClientRect();
    if (tr.left < br.left) bar.scrollLeft -= br.left - tr.left;
    else if (tr.right > br.right) bar.scrollLeft += tr.right - br.right;
  }

  function select(card, focusTab) {
    cards.forEach(c => c.classList.toggle('is-active', c === card));
    tabFor.forEach((t, id) => {
      const on = id === card.id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    fileBtn.forEach((b, id) => {
      const on = id === card.id;
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    const f = folderOf.get(card.id);
    if (f) setOpen(f, true);   // reveal the file in the explorer, as an editor does
    const g = groupOf(card);
    crumb.textContent = 'projects / ' + (g ? g + ' / ' : '') + fileOf(card);
    const t = tabFor.get(card.id);
    if (focusTab) t.focus();
    reveal(t);
  }

  bar.addEventListener('keydown', e => {
    const t = e.target.closest('.proj-tab');
    if (!t) return;
    const all = allTabs(), cur = all.indexOf(t), last = all.length - 1;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(cardOf(t.dataset.for));
      return;
    }
    // Shift + arrow moves the tab itself, the keyboard form of dragging it.
    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const to = e.key === 'ArrowLeft' ? cur - 1 : cur + 1;
      if (to < 0 || to > last) return;
      bar.insertBefore(t, e.key === 'ArrowLeft' ? all[to] : all[to].nextSibling);
      t.focus();
      reveal(t);
      return;
    }
    const next = { ArrowRight: cur === last ? 0 : cur + 1, ArrowLeft: cur === 0 ? last : cur - 1,
                   Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(cardOf(all[next].dataset.for), true);
  });

  // Drag to reorder. Fine pointers only: on touch, HTML5 drag-and-drop competes with
  // scrolling the bar, and the tabs there are a scroller first.
  if (window.matchMedia('(pointer: fine)').matches) {
    let dragging = null;
    const clear = () => bar.querySelectorAll('.drop-before, .drop-after')
      .forEach(n => n.classList.remove('drop-before', 'drop-after'));
    const after = (over, x) => { const r = over.getBoundingClientRect(); return x > r.left + r.width / 2; };

    allTabs().forEach(t => { t.draggable = true; });
    bar.addEventListener('dragstart', e => {
      const t = e.target.closest('.proj-tab');
      if (!t) return;
      dragging = t;
      t.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', t.dataset.for);
    });
    bar.addEventListener('dragover', e => {
      if (!dragging) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clear();
      const over = e.target.closest('.proj-tab');
      if (over && over !== dragging) over.classList.add(after(over, e.clientX) ? 'drop-after' : 'drop-before');
    });
    bar.addEventListener('drop', e => {
      if (!dragging) return;
      e.preventDefault();
      const over = e.target.closest('.proj-tab');
      if (over && over !== dragging) bar.insertBefore(dragging, after(over, e.clientX) ? over.nextSibling : over);
      else if (!over) bar.appendChild(dragging);   // dropped on the empty end of the bar
    });
    bar.addEventListener('dragend', () => {
      if (dragging) dragging.classList.remove('is-dragging');
      dragging = null;
      clear();
    });
  }

  // Project pages link back to /#project-<name>; honour that by opening that file.
  const fromHash = () => cards.find(c => '#' + c.id === location.hash);
  window.addEventListener('hashchange', () => { const c = fromHash(); if (c) select(c); });
  select(fromHash() || cards[0]);
})();
