// Theme system

const DARK_THEMES = new Set(['dark','vscode','darcula','tokyo','dracula','nord','github-dark','atom-one-dark']);

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
  { id: 'github-dark',   label: 'GitHub Dark',        color: '#58a6ff', bg: '#0d1117', type: 'ide' },
  { id: 'atom-one-dark', label: 'Atom One Dark',      color: '#c678dd', bg: '#282c34', type: 'ide' },
  { id: 'xcode',         label: 'Xcode',              color: '#9b2393', bg: '#ffffff', type: 'ide' },
];

const MODE_ICONS = {
  light:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  dark:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
};

// Migrate old stored theme values
const VALID_THEMES = new Set(THEMES.filter(t => !t.divider).map(t => t.id));
let _stored = localStorage.getItem('theme') || 'light';
// Light is the deliberate default rather than following the OS. System stays available in
// the menu for anyone who wants it.
if (!VALID_THEMES.has(_stored)) _stored = 'light';
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
  'dracula': 'Dracula', 'nord': 'Nord', 'github-dark': 'GitHub', 'atom-one-dark': 'Atom', 'xcode': 'Xcode',
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

// Build dropdown menu items
function buildThemeMenu() {
  const menu = document.getElementById('themeMenu');
  if (!menu) return;

  menu.innerHTML = '';

  // System resolves to whichever of Light/Dark the OS is set to, so one of those two is always a
  // duplicate of it. Hide whichever half of that pair is not the active theme, which leaves exactly
  // two modes on offer: the current one, and the other thing you could have.
  const osIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const twin = osIsDark ? 'dark' : 'light';
  const hiddenMode = activeTheme === twin ? 'system' : twin;

  THEMES.forEach(entry => {
    if (entry.type === 'mode' && entry.id === hiddenMode) return;

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

// Dropdown open / close
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

// Close on outside click or Escape
document.addEventListener('click', e => {
  if (themeDropdownEl && !themeDropdownEl.contains(e.target)) closeDropdown();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDropdown();
});

// Re-apply is-dark when OS dark mode changes (System mode only)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (activeTheme === 'system') {
    document.documentElement.classList.toggle('is-dark', isDark('system'));
  }
  // The OS just changed which mode System duplicates, so the menu pair has to swap too.
  buildThemeMenu();
  updateDropdownBtn(activeTheme);
});

// Init
buildThemeMenu();
applyTheme(activeTheme);
