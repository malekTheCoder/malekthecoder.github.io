// Typing animation
const phrases = [
  'Computer Engineering @ GMU',
  'Machine Learning Engineer',
  'Robotics & AI Engineer',
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

  // On a short screen the hero name sits right behind the hint. Measure first and skip the hint
  // entirely rather than drawing one on top of the other.
  const nameEl = document.querySelector('.hero-name') || document.querySelector('.hero h1');
  if (nameEl) {
    const hr = hint.getBoundingClientRect();
    const nr = nameEl.getBoundingClientRect();
    if (hr.bottom > nr.top - 8 && hr.right > nr.left && hr.left < nr.right) return;
  }

  // The scroll cue waits its turn, so the two are not animating at once.
  const cueEl = document.querySelector('.scroll-indicator');
  if (cueEl) cueEl.classList.add('is-waiting');

  let gone = false;
  function dismiss() {
    if (gone) return;
    gone = true;
    hint.classList.remove('is-visible');
    if (cueEl) cueEl.classList.remove('is-waiting');
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('click', dismiss, true);
  }

  // Dismiss when the hero name scrolls close to the hint
  const heroName = document.querySelector('.hero-name');
  function onScroll() {
    if (!heroName) { if (window.scrollY > 80) dismiss(); return; }
    const hintBottom = hint.getBoundingClientRect().bottom;
    const nameTop    = heroName.getBoundingClientRect().top;
    if (nameTop < hintBottom + 80) dismiss();
  }

  setTimeout(() => {
    hint.classList.add('is-visible');

    // Draw in: wavy body first, then arrowhead
    if (paths[0]) {
      paths[0].style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)';
      paths[0].style.strokeDashoffset = '0';
    }
    if (paths[1]) {
      paths[1].style.transition = 'stroke-dashoffset 0.3s ease 0.95s';
      paths[1].style.strokeDashoffset = '0';
    }

    document.addEventListener('click', dismiss, true);
    window.addEventListener('scroll', onScroll, { passive: true });
  }, 900);

  // Auto-dismiss after 6s
  setTimeout(dismiss, 6000);
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
