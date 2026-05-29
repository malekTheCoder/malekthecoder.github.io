/* ═══════════════════════════════════════════
   THEME SYSTEM — Dropdown with IDE themes
═══════════════════════════════════════════ */

const DARK_THEMES = new Set(['dark','vscode','darcula','tokyo','dracula','nord','github-dark']);

const THEMES = [
  { id: 'light',       label: 'Light',             color: null,      type: 'mode' },
  { id: 'dark',        label: 'Dark',              color: null,      type: 'mode' },
  { id: 'system',      label: 'System',            color: null,      type: 'mode' },
  { divider: true },
  { id: 'vscode',      label: 'VS Code Dark+',      color: '#569cd6', bg: '#1e1e1e', type: 'ide' },
  { id: 'darcula',     label: 'JetBrains Darcula',   color: '#ffc66d', bg: '#2b2b2b', type: 'ide' },
  { id: 'tokyo',       label: 'Tokyo Night',         color: '#7aa2f7', bg: '#1a1b26', type: 'ide' },
  { id: 'dracula',     label: 'Dracula',             color: '#bd93f9', bg: '#282a36', type: 'ide' },
  { id: 'nord',        label: 'Nord',                color: '#88c0d0', bg: '#2e3440', type: 'ide' },
  { id: 'github-dark', label: 'GitHub Dark',         color: '#58a6ff', bg: '#0d1117', type: 'ide' },
];

const MODE_ICONS = {
  light:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  dark:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
};

/* Migrate old theme values from the previous toggle system */
const VALID_THEMES = new Set(THEMES.filter(t => !t.divider).map(t => t.id));
let _stored = localStorage.getItem('theme') || 'system';
if (!VALID_THEMES.has(_stored)) _stored = 'system'; // e.g. old "dark" value
let activeTheme = _stored;

function isDark(theme) {
  if (DARK_THEMES.has(theme)) return true;
  if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return false;
}

function applyTheme(theme) {
  activeTheme = theme;

  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  document.documentElement.classList.toggle('is-dark', isDark(theme));
  localStorage.setItem('theme', theme);
  updateDropdownBtn(theme);
}

const THEME_SHORT = {
  'light': 'Light', 'dark': 'Dark', 'system': 'System',
  'vscode': 'VS Code', 'darcula': 'Darcula', 'tokyo': 'Tokyo',
  'dracula': 'Dracula', 'nord': 'Nord', 'github-dark': 'GitHub',
};

function updateDropdownBtn(theme) {
  const iconEl = document.getElementById('themeDropdownIcon');
  const btn    = document.getElementById('themeDropdownBtn');
  if (!iconEl || !btn) return;

  const entry = THEMES.find(t => !t.divider && t.id === theme);
  if (!entry) return;

  const short = THEME_SHORT[theme] || entry.label;

  if (entry.type === 'mode') {
    iconEl.innerHTML = `${MODE_ICONS[theme] || ''}<span class="theme-btn-label">${short}</span>`;
  } else {
    iconEl.innerHTML = `<span class="theme-dot" style="background:${entry.color};box-shadow:0 0 0 1.5px ${entry.bg}"></span><span class="theme-btn-label">${short}</span>`;
  }
  btn.title = entry.label;
  btn.setAttribute('aria-label', `Theme: ${entry.label}`);
}

/* Build dropdown menu items */
function buildThemeMenu() {
  const menu = document.getElementById('themeMenu');
  if (!menu) return;

  menu.innerHTML = '';

  THEMES.forEach(entry => {
    if (entry.divider) {
      const div = document.createElement('div');
      div.className = 'theme-menu-divider';
      menu.appendChild(div);
      return;
    }

    const item = document.createElement('button');
    item.className = 'theme-menu-item';
    item.setAttribute('role', 'option');
    item.dataset.themeId = entry.id;

    if (entry.type === 'mode') {
      item.innerHTML = `
        <span class="theme-menu-icon">${MODE_ICONS[entry.id] || ''}</span>
        <span class="theme-menu-label">${entry.label}</span>
        <span class="theme-menu-check">✓</span>
      `;
    } else {
      item.innerHTML = `
        <span class="theme-dot" style="background:${entry.color};box-shadow:0 0 0 1.5px ${entry.bg}"></span>
        <span class="theme-menu-label">${entry.label}</span>
        <span class="theme-menu-check">✓</span>
      `;
    }

    item.addEventListener('click', () => {
      applyTheme(entry.id);
      closeDropdown();
      updateMenuActive();
    });

    menu.appendChild(item);
  });

  updateMenuActive();
}

function updateMenuActive() {
  const menu = document.getElementById('themeMenu');
  if (!menu) return;
  menu.querySelectorAll('.theme-menu-item').forEach(item => {
    const isActive = item.dataset.themeId === activeTheme;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-selected', String(isActive));
  });
}

/* Dropdown open / close */
const themeDropdownEl  = document.getElementById('themeDropdown');
const themeDropdownBtn = document.getElementById('themeDropdownBtn');

function openDropdown() {
  if (!themeDropdownEl || !themeDropdownBtn) return;
  themeDropdownEl.classList.add('open');
  themeDropdownBtn.setAttribute('aria-expanded', 'true');
}

function closeDropdown() {
  if (!themeDropdownEl || !themeDropdownBtn) return;
  themeDropdownEl.classList.remove('open');
  themeDropdownBtn.setAttribute('aria-expanded', 'false');
}

if (themeDropdownBtn) {
  themeDropdownBtn.addEventListener('click', e => {
    e.stopPropagation();
    themeDropdownEl.classList.contains('open') ? closeDropdown() : openDropdown();
  });
}

/* Close on outside click or Escape */
document.addEventListener('click', e => {
  if (themeDropdownEl && !themeDropdownEl.contains(e.target)) closeDropdown();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDropdown();
});

/* Re-apply is-dark when OS dark mode changes (only matters in System mode) */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (activeTheme === 'system') {
    document.documentElement.classList.toggle('is-dark', isDark('system'));
  }
});

/* Init */
buildThemeMenu();
applyTheme(activeTheme);


/* ═══════════════════════════════════════════
   TYPING ANIMATION
═══════════════════════════════════════════ */
const phrases = [
  'Computer Engineer @ GMU',
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


/* ═══════════════════════════════════════════
   NAVBAR — SCROLL + ACTIVE LINK + NAME REVEAL
═══════════════════════════════════════════ */
const navbar   = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');
const navLogo  = document.getElementById('navLogo');
const heroName = document.querySelector('.hero-name');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);

  /* Reveal "Malek Swilam" in nav as the hero heading rises behind the navbar */
  if (navLogo && heroName) {
    navLogo.classList.toggle('visible', heroName.getBoundingClientRect().bottom < 72);
  }

  /* Highlight the current section link */
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}, { passive: true });


/* ═══════════════════════════════════════════
   HAMBURGER MENU
═══════════════════════════════════════════ */
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


/* ═══════════════════════════════════════════
   SCROLL ANIMATIONS — INTERSECTION OBSERVER
═══════════════════════════════════════════ */
const animatedEls = document.querySelectorAll('[data-animate]');

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el       = entry.target;
        const siblings = [...el.parentElement.querySelectorAll('[data-animate]')];
        const delay    = siblings.indexOf(el) * 80;
        setTimeout(() => el.classList.add('is-visible'), delay);
        observer.unobserve(el);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

animatedEls.forEach(el => observer.observe(el));


/* ═══════════════════════════════════════════
   SMOOTH SCROLL FOR ANCHOR LINKS
═══════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
