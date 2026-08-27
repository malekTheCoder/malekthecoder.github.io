// Typing animation
const phrases = [
  'Computer Engineering @ GMU',
  'Machine Learning Researcher',
  'Robotics Programmer',
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

  let gone = false;
  function dismiss() {
    if (gone) return;
    gone = true;
    hint.classList.remove('is-visible');
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
