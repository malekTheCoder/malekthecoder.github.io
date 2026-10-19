// Typing animation
const phrases = [
  'Computer Engineering @ GMU',
  'Machine Learning',
  'Robotics',
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
  // The hero's dot field draws a matching shape as the phrase types out (js/halftone.js).
  document.dispatchEvent(new CustomEvent('hero:typing', {
    detail: { index: phraseIndex, progress: charIndex / current.length },
  }));

  let delay = isDeleting ? 45 : 96;

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

// Before the first phrase the subtitle reads as loading, for as long as the hero's dot field
// takes to sweep in and circle where the first picture will draw. Then the real phrases start.
function loadingIntro() {
  if (!typedEl) return;
  const word = 'Loading', frames = [];
  for (let i = 1; i <= word.length; i++) frames.push([word.slice(0, i), 80]);
  for (let round = 0; round < 2; round++) for (const d of ['.', '..', '...', '']) frames.push([word + d, 230]);
  for (let i = word.length - 1; i >= 0; i--) frames.push([word.slice(0, i), 45]);
  // The hero's dot spinner keys off these, so it only ever plays alongside this text.
  typedEl.dataset.loadingStart = performance.now();
  typedEl.dataset.loadingMs = frames.reduce((sum, f) => sum + f[1], 0) + 250;
  let n = 0;
  (function step() {
    if (n === frames.length) { setTimeout(typeLoop, 250); return; }
    const [text, delay] = frames[n++];
    typedEl.textContent = text;
    setTimeout(step, delay);
  })();
}

loadingIntro();



// Navbar: scroll state, active link, name reveal
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


// Scroll reveal: only section headers carry [data-animate] now, so there are
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
  const stacked = window.matchMedia('(max-width: 760px)');
  const orient = () => bar.setAttribute('aria-orientation', stacked.matches ? 'vertical' : 'horizontal');
  orient();
  if (stacked.addEventListener) stacked.addEventListener('change', orient);

  grid.parentNode.insertBefore(win, grid);
  main.append(bar, crumb, grid);
  win.append(side, main);
  grid.classList.add('is-tabs');

  // ---- Explorer: files grouped into folders, in the order the cards appear.
  const head = el('div', 'proj-side-head');
  head.textContent = 'Explorer';
  const root = el('button', 'proj-root', { type: 'button', 'aria-expanded': 'true' });
  root.innerHTML = chevron;
  root.append('projects');
  const tree = el('div', 'proj-tree');
  root.addEventListener('click', () => {
    const open = root.getAttribute('aria-expanded') !== 'true';
    root.setAttribute('aria-expanded', open ? 'true' : 'false');
    tree.hidden = !open;
  });
  side.append(head, root, tree);

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
    tree.appendChild(ul);
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
    // On phones the tabs stack, and a vertical list answers to up and down.
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    const fwd  = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    // Shift + arrow moves the tab itself, the keyboard form of dragging it.
    if (e.shiftKey && (back || fwd)) {
      e.preventDefault();
      const to = back ? cur - 1 : cur + 1;
      if (to < 0 || to > last) return;
      bar.insertBefore(t, back ? all[to] : all[to].nextSibling);
      t.focus();
      reveal(t);
      return;
    }
    const next = fwd ? (cur === last ? 0 : cur + 1) : back ? (cur === 0 ? last : cur - 1)
               : { Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(cardOf(all[next].dataset.for), true);
  });

  // Drag to reorder. The tab itself follows the pointer and the others slide aside to
  // make room, the way an editor does it. (HTML5 drag-and-drop was tried first; its
  // ghost is a snapshot of the element, and an inactive tab has no background of its
  // own, so only the label appeared to move.) Fine pointers only: on touch the bar is
  // a scroller first, and a horizontal drag would fight it.
  if (window.matchMedia('(pointer: fine)').matches) {
    let drag = null;
    let swallowClick = false;

    // Slide everything to match the lifted tab's position.
    function move(dx) {
      const { t, tabs, from, rects } = drag;
      const w = rects[from].width;
      const last = rects.length - 1;
      dx = Math.max(rects[0].left - rects[from].left,
           Math.min(rects[last].left + rects[last].width - (rects[from].left + w), dx));
      const centre = rects[from].left + w / 2 + dx;
      // its new slot = how many of the other tabs sit left of its centre
      let to = 0;
      tabs.forEach((o, j) => { if (j !== from && rects[j].left + rects[j].width / 2 < centre) to++; });
      drag.to = to;
      t.style.transform = 'translateX(' + dx + 'px)';
      tabs.forEach((o, j) => {
        if (j === from) return;
        const k = j < from ? j : j - 1;           // its place among the other tabs
        let shift = 0;
        if (j < from && k >= to) shift = w;       // the lifted tab has passed in front of it
        else if (j > from && k < to) shift = -w;  // or has moved back behind it
        o.style.transform = shift ? 'translateX(' + shift + 'px)' : '';
      });
    }

    bar.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (getComputedStyle(bar).flexDirection === 'column') return;   // stacked: nothing to slide
      const t = e.target.closest('.proj-tab');
      if (!t) return;
      const tabs = allTabs();
      drag = { t, tabs, from: tabs.indexOf(t), to: tabs.indexOf(t), startX: e.clientX, id: e.pointerId, active: false };
    });

    window.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.active) {
        if (Math.abs(dx) < 5) return;               // a click, not a drag
        drag.active = true;
        select(cardOf(drag.t.dataset.for));         // the lifted tab is the open one
        drag.rects = drag.tabs.map(o => { const r = o.getBoundingClientRect(); return { left: r.left, width: r.width }; });
        bar.classList.add('is-reordering');
        drag.t.classList.add('is-dragging');
        try { drag.t.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
      }
      move(dx);
    });

    const finish = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.active) return;
      swallowClick = true;                          // the click that follows a drag is not a selection
      setTimeout(() => { swallowClick = false; }, 0);
      const { t, tabs, from, to, rects } = d;
      const others = tabs.filter((_, j) => j !== from);
      // slide into the slot it is being dropped on, then make the new order real
      const slotLeft = rects[0].left + others.slice(0, to).reduce((sum, o) => sum + rects[tabs.indexOf(o)].width, 0);
      t.classList.replace('is-dragging', 'is-settling');
      t.style.transition = 'transform 0.16s ease';
      t.style.transform = 'translateX(' + (slotLeft - rects[from].left) + 'px)';
      setTimeout(() => {
        if (to !== from) bar.insertBefore(t, others[to] || null);
        tabs.forEach(o => { o.style.transform = ''; o.style.transition = ''; });
        t.classList.remove('is-settling');
        bar.classList.remove('is-reordering');
        reveal(t);
      }, 170);
    };
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    bar.addEventListener('click', e => {
      if (swallowClick) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  // Project pages link back to /#project-<name>; honour that by opening that file.
  const fromHash = () => cards.find(c => '#' + c.id === location.hash);
  window.addEventListener('hashchange', () => { const c = fromHash(); if (c) select(c); });
  select(fromHash() || cards[0]);
})();

// Clips in the experience cards. Nothing downloads until the card is close to the screen. A clip
// plays once while visible, then rests on its last frame with a replay button. With reduced
// motion it never starts on its own: the same button reads Play.
(function () {
  const vids = document.querySelectorAll('video[data-src]');
  if (!vids.length) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  vids.forEach(v => {
    const wrap = v.parentElement, btn = wrap.querySelector('.timeline-video-replay');
    const label = btn && btn.querySelector('span');
    let ended = false;
    const show = text => { if (!btn) return; label.textContent = text; btn.hidden = false; wrap.classList.add('is-resting'); };
    const hide = () => { if (!btn) return; btn.hidden = true; wrap.classList.remove('is-resting'); };
    const load = () => { if (!v.src) v.src = v.dataset.src; };
    v.addEventListener('ended', () => { ended = true; show('Replay'); });
    if (btn) btn.addEventListener('click', () => {
      load(); ended = false; hide();
      v.currentTime = 0; v.play().catch(() => {});
    });
    if (still) show('Play');
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) load();
      if (still || ended) return;
      // Start only once it is really on screen, so the one play is not spent above the fold.
      if (e.intersectionRatio >= 0.6) v.play().catch(() => {}); else v.pause();
    }, { rootMargin: '300px 0px', threshold: [0, 0.6] }).observe(v);
  });
})();

// Experience as a doubly linked list. Each role is a node with a prev and a next pointer; head is
// the most recent, its prev and the tail's next are null. A curr pointer sits over the node being
// read, and prev/next (buttons, arrow keys, or clicking a node) walk it along the list, showing that
// role's card underneath. Built from the timeline, so without JS the plain timeline stays.
(function () {
  const timeline = document.querySelector('#experience .timeline');
  if (!timeline) return;
  const items = [...timeline.querySelectorAll(':scope > .timeline-item')];
  if (items.length < 2) return;
  const el = (tag, cls, attrs = {}) => { const e = document.createElement(tag); if (cls) e.className = cls; for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  // the years a role covers: one year, or first to last when it spans several (FTC is 2023–2026)
  const year = it => { const ys = (((it.querySelector('.timeline-date') || {}).textContent || '').match(/\d{4}/g) || []); return ys.length ? (ys[0] === ys[ys.length - 1] ? ys[0] : ys[0] + '–' + ys[ys.length - 1]) : ''; };

  const wrap = el('div', 'll', { role: 'group', 'aria-label': 'Experience, as a doubly linked list' });
  const track = el('div', 'll-track', { role: 'tablist', 'aria-label': 'Roles' });
  const curr = el('span', 'll-curr', { 'aria-hidden': 'true' }); curr.innerHTML = '<span>curr</span>';
  track.append(curr);
  const headLbl = el('span', 'll-end', { 'aria-hidden': 'true' }); headLbl.textContent = 'head';
  track.append(headLbl, link(true));

  const nodes = items.map((it, i) => {
    const id = 'll-card-' + i;
    it.id = id; it.setAttribute('role', 'tabpanel');
    const b = el('button', 'll-node', { type: 'button', role: 'tab', 'aria-controls': id, tabindex: '-1' });
    const role = (it.querySelector('.timeline-role') || {}).textContent || '';
    b.innerHTML = `<span class="ll-ptr" aria-hidden="true">${i === 0 ? '∅' : '•'}</span>` +
      `<span class="ll-data"><span class="ll-name"></span><span class="ll-sub"></span></span>` +
      `<span class="ll-ptr" aria-hidden="true">${i === items.length - 1 ? '∅' : '•'}</span>`;
    b.querySelector('.ll-name').textContent = it.dataset.node || role;
    b.querySelector('.ll-sub').textContent = year(it);
    b.addEventListener('click', () => go(i, true));
    track.append(b);
    if (i < items.length - 1) track.append(link(false));
    return b;
  });
  const nullLbl = el('span', 'll-end', { 'aria-hidden': 'true' }); nullLbl.textContent = 'null';
  track.append(link(true), nullLbl);

  // the two-way link between nodes: next on top, prev underneath
  function link(single) {
    const s = el('span', 'll-link' + (single ? ' is-single' : ''), { 'aria-hidden': 'true' });
    s.innerHTML = single
      ? '<svg viewBox="0 0 40 24"><path d="M2 12H36M31 7l5 5-5 5"/></svg>'
      : '<svg viewBox="0 0 40 24"><path d="M2 8H36M31 3l5 5-5 5"/><path d="M38 16H4M9 11l-5 5 5 5"/></svg>';
    return s;
  }

  const bar = el('div', 'll-controls');
  // the buttons read as the Java that walks the list
  const prev = el('button', 'll-step', { type: 'button', 'aria-label': 'Previous role' });
  prev.innerHTML = '<span class="ll-arrow" aria-hidden="true">←</span><span aria-hidden="true"><span class="ll-code-lhs">curr = </span>curr.<b>prev</b>;</span>';
  const next = el('button', 'll-step', { type: 'button', 'aria-label': 'Next role' });
  next.innerHTML = '<span aria-hidden="true"><span class="ll-code-lhs">curr = </span>curr.<b>next</b>;</span><span class="ll-arrow" aria-hidden="true">→</span>';
  bar.append(prev, next);
  wrap.append(track, bar);
  timeline.before(wrap);

  // A handwritten note beside the heading says what this is, and a switch offers the plain
  // timeline instead; the choice is remembered.
  const header = document.querySelector('#experience .section-header');
  const aside = el('span', 'll-aside', { 'aria-hidden': 'true' });
  // The note writes itself out the first time it comes into view, the way "hello" does on a new
  // Apple device: one pen moving along the centre of each stroke at a steady speed, flowing from
  // one stroke into the next where they join and lifting only between words. The strokes were
  // traced from the centre lines of Sacramento, a connected monoline script close to Apple's
  // hello lettering, and are drawn with a heavier pen than the font's own.
  const HAND = {"w":1670,"h":322,"s":20,"d":["M62 173Q59 174 56.5 177.5Q54 181 50.5 183.5Q47 186 40.5 186.0Q34 186 30.5 181.5Q27 177 26.5 171.0Q26 165 27.5 160.0Q29 155 31.0 152.0Q33 149 39.5 144.0Q46 139 52.0 138.5Q58 138 63.5 141.0L69 144","M63 160L62 173","M62 173Q66 176 67.0 179.0Q68 182 71.0 184.5Q74 187 80.0 187.0Q86 187 92.5 181.5Q99 176 106.0 164.5Q113 153 114.5 149.0Q116 145 117.5 144.0L119 143","M119 143L119 124","M109 182Q113 186 119.5 187.0L126 188","M126 188Q133 177 133.5 174.0Q134 171 131.0 162.0Q128 153 126.0 149.5Q124 146 121.5 144.5L119 143","M126 188Q127 191 133.5 191.0Q140 191 146.0 188.0Q152 185 157.0 180.0Q162 175 167.5 165.0L173 155","M259 173Q256 174 253.5 177.5Q251 181 247.5 183.5Q244 186 237.5 186.0Q231 186 227.5 181.5Q224 177 223.5 171.0Q223 165 224.5 160.0Q226 155 228.0 152.0Q230 149 236.5 144.0Q243 139 249.0 138.5Q255 138 260.5 141.0L266 144","M260 160L259 173","M259 173Q263 176 264.0 179.0Q265 182 268.0 184.5Q271 187 277.0 187.0Q283 187 289.5 181.5Q296 176 301.5 166.5L307 157","M394 137Q379 139 372.5 144.0Q366 149 364.0 152.0Q362 155 360.5 160.0Q359 165 359.0 170.0Q359 175 360.5 178.5Q362 182 364.0 184.0Q366 186 372.0 186.0Q378 186 381.5 183.5Q385 181 388.5 174.5Q392 168 394.5 166.5L397 165","M397 165L398 144","M398 144Q404 140 405.0 138.0Q406 136 411.5 116.5Q417 97 418.5 85.5Q420 74 420.0 63.5Q420 53 418.5 47.5Q417 42 414.5 40.0Q412 38 410.5 38.0Q409 38 405.5 41.0Q402 44 398.5 54.0Q395 64 393.5 75.0Q392 86 392.0 101.5Q392 117 393.0 127.0L394 137","M394 137Q395 142 396.5 143.0L398 144","M397 165Q401 167 403.5 173.5Q406 180 410.0 183.5Q414 187 420.5 186.5Q427 186 432.0 181.5Q437 177 438.5 174.5Q440 172 443.0 171.0L446 170","M446 170Q447 160 448.5 157.0Q450 154 454.5 149.0Q459 144 462.0 142.5L465 141","M446 170Q450 180 456.0 184.5Q462 189 468.0 189.0Q474 189 477.5 187.5Q481 186 484.0 183.5Q487 181 489.0 176.5L491 172","M491 171Q479 163 476.5 157.0Q474 151 475.0 146.5Q476 142 479.0 140.0Q482 138 485.5 140.0Q489 142 490.5 145.5Q492 149 492.0 160.0L492 171","M492 172Q509 172 516.0 168.5L523 165","M523 165Q528 147 530.5 143.0L533 139","M523 165Q526 179 529.5 182.5Q533 186 539.0 186.0Q545 186 547.0 185.0Q549 184 552.5 179.5Q556 175 558.5 174.0L561 173","M561 173Q562 143 563.0 141.0L564 139","M561 173Q572 187 578.0 187.0Q584 187 587.0 185.5Q590 184 594.0 180.0Q598 176 601.0 171.0Q604 166 606.5 165.0L609 164","M609 164L611 146","M611 146Q608 144 607.5 132.0Q607 120 607.0 105.0Q607 90 608.5 71.5Q610 53 613.0 43.0Q616 33 619.5 29.0Q623 25 626.0 24.5Q629 24 632.5 27.0Q636 30 637.5 34.0Q639 38 639.0 56.5Q639 75 637.5 83.0Q636 91 630.5 108.0Q625 125 621.5 133.5Q618 142 614.5 144.0L611 146","M609 164Q612 166 615.0 174.0Q618 182 622.0 186.0Q626 190 628.5 190.5Q631 191 635.5 190.5Q640 190 643.5 188.0Q647 186 651.5 179.5L656 173","M656 173Q656 152 655.0 149.0Q654 146 651.0 142.5Q648 139 644.0 138.5Q640 138 636.5 140.5Q633 143 632.0 146.5Q631 150 634.0 154.5L637 159","M656 173Q669 179 674.5 179.0Q680 179 686.0 174.0Q692 169 694.5 165.0Q697 161 699.5 160.0L702 159","M702 159L703 143","M703 143Q700 138 699.5 129.5Q699 121 700.5 93.5Q702 66 704.0 56.5Q706 47 709.0 39.0Q712 31 714.0 28.5Q716 26 720.0 25.0Q724 24 726.5 25.5Q729 27 731.0 31.5Q733 36 733.5 49.0Q734 62 733.0 70.0Q732 78 729.5 88.0Q727 98 721.0 113.5Q715 129 712.5 134.0Q710 139 706.5 141.0L703 143","M702 159Q705 161 705.5 164.5Q706 168 709.5 175.0Q713 182 715.5 184.5Q718 187 720.5 188.0Q723 189 727.0 189.0Q731 189 735.0 187.0Q739 185 745.5 177.5Q752 170 754.0 169.5L756 169","M756 169Q762 147 765.0 142.0L768 137","M756 169Q758 170 759.5 175.5Q761 181 763.5 183.5Q766 186 769.0 186.5Q772 187 775.5 186.5Q779 186 783.0 182.0Q787 178 790.0 176.5L793 175","M793 175L798 147","M792 213Q787 214 783.0 219.0Q779 224 771.5 241.0Q764 258 762.5 264.0Q761 270 761.0 277.5Q761 285 762.0 288.0Q763 291 766.0 293.5Q769 296 774.5 295.5Q780 295 783.5 291.0Q787 287 788.5 283.0Q790 279 792.0 265.0Q794 251 794.0 237.5Q794 224 793.0 218.5L792 213","M792 213L795 197","M795 197Q795 177 794.0 176.0L793 175","M795 197Q802 195 809.5 187.5Q817 180 824.5 168.5L832 157","M889 143Q886 138 885.5 129.5Q885 121 886.5 93.5Q888 66 890.0 56.5Q892 47 895.0 39.0Q898 31 900.0 28.5Q902 26 906.0 25.0Q910 24 912.5 25.5Q915 27 917.0 31.5Q919 36 919.5 49.0Q920 62 919.0 70.0Q918 78 915.5 88.0Q913 98 907.0 113.5Q901 129 898.5 134.0Q896 139 892.5 141.0L889 143","M889 143Q889 156 890.5 162.0Q892 168 895.5 175.0Q899 182 902.5 185.0Q906 188 913.0 188.0Q920 188 925.5 183.5Q931 179 934.0 174.5Q937 170 940.0 168.5L943 167","M943 167Q946 158 946.5 147.0L947 136","M942 97Q945 92 948.0 91.5Q951 91 953.5 93.0Q956 95 956.0 98.5Q956 102 954.5 103.5Q953 105 949.5 105.0Q946 105 944.5 103.5Q943 102 942.5 99.5L942 97","M943 167Q949 183 952.0 186.0Q955 189 961.0 189.5Q967 190 972.0 187.0Q977 184 980.0 180.5Q983 177 988.0 169.0Q993 161 996.5 152.5Q1000 144 1004.5 139.5Q1009 135 1011.5 136.5Q1014 138 1014.5 141.0Q1015 144 1014.0 155.0Q1013 166 1013.5 174.5Q1014 183 1016.5 182.5Q1019 182 1021.0 180.0Q1023 178 1026.5 171.0Q1030 164 1035.5 156.0Q1041 148 1044.0 145.0Q1047 142 1049.5 141.0Q1052 140 1054.0 140.5Q1056 141 1057.5 143.0Q1059 145 1059.0 161.0Q1059 177 1061.5 181.5Q1064 186 1067.5 187.0Q1071 188 1075.0 187.0Q1079 186 1083.0 183.0Q1087 180 1090.5 175.0Q1094 170 1097.5 168.5L1101 167","M1101 167Q1103 158 1104.0 95.5L1105 33","M1101 167L1105 174","M1105 174L1104 188","M1105 174Q1112 169 1113.5 164.0Q1115 159 1118.5 153.5Q1122 148 1126.5 143.5Q1131 139 1133.5 138.0Q1136 137 1140.5 137.5Q1145 138 1147.0 140.0Q1149 142 1149.5 148.0Q1150 154 1146.5 159.0Q1143 164 1133.5 169.0Q1124 174 1124.5 177.5Q1125 181 1128.5 184.0Q1132 187 1137.5 188.5Q1143 190 1148.5 189.5Q1154 189 1160.5 185.5Q1167 182 1173.5 174.5Q1180 167 1182.5 166.0L1185 165","M1185 165Q1189 147 1192.5 143.0Q1196 139 1200.0 138.0Q1204 137 1208.0 140.0Q1212 143 1212.5 146.5Q1213 150 1211.0 156.0Q1209 162 1204.5 166.5Q1200 171 1196.0 172.5L1192 174","M1192 174Q1188 171 1187.5 168.5Q1187 166 1186.0 165.5L1185 165","M1192 174Q1194 182 1197.0 184.5Q1200 187 1203.0 188.0Q1206 189 1211.5 189.0Q1217 189 1221.0 187.5Q1225 186 1232.0 179.5Q1239 173 1241.0 172.5L1243 172","M1243 172Q1249 153 1253.5 148.0Q1258 143 1263.0 140.5Q1268 138 1274.0 137.5L1280 137","M1280 137Q1278 117 1278.0 101.5Q1278 86 1279.5 75.0Q1281 64 1284.5 54.0Q1288 44 1291.5 41.0Q1295 38 1296.5 38.0Q1298 38 1300.5 40.0Q1303 42 1304.5 47.5Q1306 53 1306.0 63.5Q1306 74 1304.5 85.5Q1303 97 1297.5 116.5Q1292 136 1291.0 138.0Q1290 140 1287.0 142.0L1284 144","M1284 144Q1281 142 1280.5 139.5L1280 137","M1243 172Q1245 173 1246.5 177.5Q1248 182 1250.0 184.0Q1252 186 1255.5 186.5Q1259 187 1263.5 185.5Q1268 184 1273.0 176.0Q1278 168 1280.5 166.5L1283 165","M1283 165L1284 144","M1283 165Q1287 167 1288.5 172.0Q1290 177 1294.0 181.5Q1298 186 1304.5 186.5Q1311 187 1317.0 182.0Q1323 177 1328.5 167.0L1334 157","M1391 143Q1388 138 1387.5 129.5Q1387 121 1388.5 93.5Q1390 66 1392.0 56.5Q1394 47 1397.0 39.0Q1400 31 1402.0 28.5Q1404 26 1408.0 25.0Q1412 24 1414.5 25.5Q1417 27 1419.0 31.5Q1421 36 1421.5 49.0Q1422 62 1421.0 70.0Q1420 78 1417.5 88.0Q1415 98 1409.0 113.5Q1403 129 1400.5 134.0Q1398 139 1394.5 141.0L1391 143","M1391 143Q1391 156 1392.5 162.0Q1394 168 1397.5 175.0Q1401 182 1404.5 185.0Q1408 188 1415.0 188.0Q1422 188 1427.5 183.5Q1433 179 1436.0 174.5Q1439 170 1442.0 168.5L1445 167","M1445 167Q1448 158 1448.5 147.0L1449 136","M1444 97Q1447 92 1450.0 91.5Q1453 91 1455.5 93.0Q1458 95 1458.0 98.5Q1458 102 1456.5 103.5Q1455 105 1451.5 105.0Q1448 105 1446.5 103.5Q1445 102 1444.5 99.5L1444 97","M1445 167Q1451 183 1454.0 186.0Q1457 189 1463.0 189.5Q1469 190 1474.0 187.0Q1479 184 1482.0 180.5Q1485 177 1490.0 169.0Q1495 161 1498.5 153.0Q1502 145 1503.5 144.0L1505 143","M1505 143L1505 124","M1495 182Q1499 186 1505.5 187.0L1512 188","M1512 188Q1519 177 1519.5 174.0Q1520 171 1517.0 162.0Q1514 153 1512.0 149.5Q1510 146 1507.5 144.5L1505 143","M1512 73L1558 74","M1558 74Q1554 104 1554.0 119.5Q1554 135 1555.0 141.5Q1556 148 1557.5 149.5L1559 151","M1559 151L1558 164","M1558 164Q1552 167 1550.0 171.0Q1548 175 1541.5 181.0Q1535 187 1530.5 189.0Q1526 191 1519.5 191.0Q1513 191 1512.5 189.5L1512 188","M1558 164Q1562 167 1564.5 172.5Q1567 178 1571.5 182.0Q1576 186 1582.5 186.5Q1589 187 1594.5 183.0Q1600 179 1606.5 168.0L1613 157","M1581 74Q1579 98 1576.5 110.0Q1574 122 1569.5 134.5Q1565 147 1562.0 149.0L1559 151","M1560 73Q1563 61 1567.0 57.5Q1571 54 1573.0 54.5Q1575 55 1576.5 57.0Q1578 59 1579.0 66.0L1580 73","M1580 73L1560 73","M1581 74L1644 73"]};
  const svgNS = 'http://www.w3.org/2000/svg';
  const hand = document.createElementNS(svgNS, 'svg');
  hand.setAttribute('viewBox', `0 0 ${HAND.w} ${HAND.h}`);
  hand.setAttribute('class', 'll-hand');
  hand.style.strokeWidth = HAND.s;
  const strokes = HAND.d.map(d => { const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', d); hand.append(p); return p; });
  aside.append(hand);
  // crop the drawing to the writing itself once it is laid out, so the letters fill the height
  requestAnimationFrame(() => { try { const b = hand.getBBox(), m = HAND.s; hand.setAttribute('viewBox', `${b.x - m} ${b.y - m} ${b.width + 2 * m} ${b.height + 2 * m}`); } catch (e) {} });
  let written = false;
  function write() {
    if (written) return; written = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !hand.animate) { hand.classList.add('is-written'); return; }
    const lens = strokes.map(p => p.getTotalLength());
    const speed = lens.reduce((a, b) => a + b, 0) / 1500;   // the whole phrase in about 1.5 s of pen time
    const ends = strokes.map(p => [p.getPointAtLength(0), p.getPointAtLength(p.getTotalLength())]);
    let t = 0;
    strokes.forEach((p, i) => {
      const len = lens[i], dur = Math.max(40, len / speed);
      if (i) {
        const a = ends[i - 1][1], b = ends[i][0], jump = Math.hypot(b.x - a.x, b.y - a.y);
        t += jump > HAND.s * 4 ? 140 : jump > 8 ? 30 : 0;      // a word gap, a pen lift, or no break at all
      }
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      // hidden until the pen gets there: a stroke waiting at zero length would still show its round cap as a dot
      p.animate([{ strokeDashoffset: len, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { duration: dur, delay: t, easing: 'linear', fill: 'forwards' });
      t += dur;
    });
  }
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(write, 250); } }, { threshold: 0.6 }).observe(aside);
  const toggle = el('button', 'll-toggle', { type: 'button' });
  if (header) { header.classList.add('has-ll'); header.append(aside, toggle); }
  function setMode(list, save) {
    wrap.hidden = !list; aside.hidden = !list;
    timeline.classList.toggle('is-list', list);
    toggle.textContent = list ? 'see all roles at once' : 'view as linked list';
    toggle.setAttribute('aria-pressed', String(!list));
    if (save) try { localStorage.setItem('exp-view', list ? 'list' : 'timeline'); } catch (e) {}
    if (list) go(at);
  }
  toggle.addEventListener('click', () => setMode(!timeline.classList.contains('is-list'), true));

  let at = 0;
  function go(i, focus) {
    if (i < 0 || i >= items.length) return;
    const dir = i > at ? 1 : i < at ? -1 : 0;
    at = i;
    items.forEach((it, k) => { it.classList.toggle('is-active', k === i); it.style.setProperty('--ll-dir', dir); });
    nodes.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    prev.disabled = i === 0; next.disabled = i === items.length - 1;
    // the curr pointer slides over the node, and the track scrolls it into view without moving the page
    const n = nodes[i];
    curr.style.transform = `translateX(${n.offsetLeft + n.offsetWidth / 2}px)`;
    const tr = track.getBoundingClientRect(), nr = n.getBoundingClientRect();
    if (nr.left < tr.left + 8) track.scrollLeft -= tr.left + 8 - nr.left;
    else if (nr.right > tr.right - 8) track.scrollLeft += nr.right - tr.right + 8;
    if (focus) n.focus({ preventScroll: true });
  }
  prev.addEventListener('click', () => go(at - 1));
  next.addEventListener('click', () => go(at + 1));
  track.addEventListener('keydown', e => {
    const k = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: items.length - 1 }[e.key];
    if (k === undefined) return;
    e.preventDefault(); go(k, true);
  });
  addEventListener('resize', () => { if (!wrap.hidden) go(at); });
  go(0);
  let saved = null; try { saved = localStorage.getItem('exp-view'); } catch (e) {}
  setMode(saved !== 'timeline', false);
})();
