// Project page behavior — shared by every page under /projects/

// Navbar — scroll state, reading progress on its bottom edge, and a breadcrumb
// that reveals the project name once the title scrolls out of sight
const navbar     = document.getElementById('navbar');
const navContext = document.getElementById('navContext');
const navProject = document.getElementById('navProject');
const navSection = document.getElementById('navSection');
const projTitle  = document.querySelector('.proj-title');

// Below this the nav links belong to the hamburger menu and must stay under its
// control, so the reading state only ever applies on wider screens
const wideScreen = window.matchMedia('(min-width: 769px)');

// Projects that ship a logo (Sentry, OCRadar) reuse it as a small mark beside
// their name in the breadcrumb and the sidebar. Built from the hero icon so a
// project without one simply gets no mark, with no per-page markup.
const projIcon = document.querySelector('.proj-icon');

function projectMark(className) {
  const src = projIcon && projIcon.getAttribute('src');
  if (!src) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.className = className;
  // a remote logo can 404; drop the mark rather than leave a broken image
  img.addEventListener('error', () => img.remove());
  return img;
}

// The sidebar heading says which project you're reading rather than a generic
// "on this page" — the page title is already out of view by the time it matters
const tocTitle = document.querySelector('.proj-toc-title');
if (tocTitle && projTitle) {
  tocTitle.textContent = projTitle.textContent.trim();
  const mark = projectMark('proj-toc-icon');
  if (mark) tocTitle.prepend(mark);
}

if (navProject && projTitle) {
  navProject.textContent = projTitle.textContent.trim();
  const navMark = projectMark('nav-context-icon');
  if (navMark) navProject.before(navMark);
  navProject.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Sections the breadcrumb can name, in document order
const namedSections = [...document.querySelectorAll('.proj-section[id]')]
  .map(sec => ({ el: sec, name: sec.querySelector('.proj-h2')?.textContent.trim() || '' }))
  .filter(s => s.name);

if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min((window.scrollY / scrollable) * 100, 100) : 0;
    navbar.style.setProperty('--read', pct + '%');

    // Reveal once the project title has passed behind the navbar, and stand the
    // homepage section links down so the breadcrumb isn't fighting them for room.
    // The sidebar heading rides the same trigger: while the hero title is still
    // on screen it would just be saying the name twice, so it stays collapsed.
    if (projTitle) {
      const reading = projTitle.getBoundingClientRect().bottom < 64;
      navContext?.classList.toggle('visible', reading);
      tocTitle?.classList.toggle('visible', reading);
      navbar.classList.toggle('reading', reading && wideScreen.matches);
    }

    if (navSection && namedSections.length) {
      let current = '';
      namedSections.forEach(s => {
        if (window.scrollY >= s.el.offsetTop - 140) current = s.name;
      });

      // Short final sections never cross the reading line, so pin at the bottom
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
      if (atBottom) current = namedSections[namedSections.length - 1].name;

      if (navSection.textContent !== current) navSection.textContent = current;
    }
  }, { passive: true });

  // Sync once on load — a page opened on a #section anchor lands mid-document
  // without ever firing a scroll event, and would otherwise show the wrong state
  window.dispatchEvent(new Event('scroll'));
}


// Hamburger menu
const hamburger  = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');

if (hamburger && navLinksEl) {
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
}



// Scroll animations
const animatedEls = document.querySelectorAll('[data-animate]');

if (animatedEls.length) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el       = entry.target;
          const siblings = [...el.parentElement.querySelectorAll('[data-animate]')];
          const delay    = siblings.indexOf(el) * 70;
          setTimeout(() => el.classList.add('is-visible'), delay);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px 40px 0px' }
  );

  animatedEls.forEach(el => observer.observe(el));
}


// Floating table of contents — highlight the section currently in view
const tocLinks = document.querySelectorAll('.proj-toc a');
const tocTargets = [...tocLinks]
  .map(a => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if (tocTargets.length) {
  // Constellation: each entry is a dot on a hairline. The active dot grows with
  // an accent halo; every dot above it stays lit at low opacity so the rail
  // shows how far through the page you are, not just where you are.
  window.addEventListener('scroll', () => {
    let currentIdx = -1;

    // Last section whose top has passed the reading line wins
    tocTargets.forEach((sec, i) => {
      if (window.scrollY >= sec.offsetTop - 140) currentIdx = i;
    });

    // Pin the final entry once the page bottoms out, since short last
    // sections never cross the reading line
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
    if (atBottom) currentIdx = tocTargets.length - 1;

    const currentId = currentIdx >= 0 ? tocTargets[currentIdx].id : '';

    tocLinks.forEach(link => {
      const href = link.getAttribute('href');
      const idx = tocTargets.findIndex(sec => `#${sec.id}` === href);
      link.classList.toggle('active', href === `#${currentId}`);
      link.classList.toggle('seen', idx > -1 && idx < currentIdx);
    });
  }, { passive: true });
}


// Smooth scroll for in-page anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', href);
    }
  });
});


// Click-to-play video facade — the YouTube iframe is only built on click, so
// the page never loads their player (or their cookies) unless asked. A facade
// with no video ID yet (the demo hasn't been filmed) hides its whole section
// instead of showing a dead play button, the same way the photo carousel
// hides itself until a photo actually exists.
document.querySelectorAll('[data-video-id]').forEach(facade => {
  if (!facade.dataset.videoId) {
    // No demo filmed yet. Show a reserved slot rather than dropping the section:
    // the page keeps its shape and says a demo is coming, instead of leaving a
    // play button that does nothing when clicked.
    facade.classList.add('is-placeholder');
    facade.removeAttribute('role');
    facade.removeAttribute('tabindex');
    facade.setAttribute('aria-label', `${facade.dataset.videoTitle || 'Demo video'} — not published yet`);
    const box = document.createElement('div');
    box.className = 'proj-video-placeholder';
    box.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round" width="26" height="26">
        <rect x="2" y="5" width="14" height="14" rx="2.5"/><path d="M22 8l-6 4 6 4V8z"/>
      </svg>
      <span class="proj-video-placeholder-label">Demo video</span>
      <span class="proj-video-placeholder-note">coming soon</span>`;
    facade.replaceChildren(box);
    return;
  }

  facade.addEventListener('click', () => {
    const id = facade.dataset.videoId;

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = facade.dataset.videoTitle || 'Project demo video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'proj-video-frame';

    facade.replaceChildren(iframe);
    facade.classList.add('is-playing');
  });
});


// Demo videos play when scrolled into view and pause when they leave, so the
// clip reads like a GIF without burning cycles off-screen. Skipped entirely
// when the visitor has asked for reduced motion — they can still hit play.
const demoVideos = document.querySelectorAll('.device--phone video, .proj-phone video');
const wantsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (demoVideos.length && !wantsReducedMotion) {
  const videoObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          // play() rejects if the browser blocks autoplay; the controls still work
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.4 }
  );

  demoVideos.forEach(v => videoObserver.observe(v));
}


// Device photo carousel — crossfades through real photos of the hardware, and
// hides its whole section until at least one photo actually exists, so the
// page never shows an empty frame while the photos are still being taken.
const carousel = document.querySelector('.proj-carousel');

if (carousel) {
  const section    = carousel.closest('.proj-section');
  const thumbsWrap = document.querySelector('.proj-carousel-thumbs');
  const frames     = [...carousel.querySelectorAll('img')];

  const ADVANCE_MS = 3200;   // auto-advance cadence
  const RESUME_MS  = 9000;   // how long a manual interaction suppresses auto-play

  Promise.all(frames.map(img => new Promise(resolve => {
    if (img.complete) return resolve(img.naturalWidth > 0 ? img : null);
    img.addEventListener('load',  () => resolve(img));
    img.addEventListener('error', () => resolve(null));
  }))).then(loaded => {
    const photos = loaded.filter(Boolean);
    if (!photos.length) {
      section.style.display = 'none';
      document.querySelector(`.proj-toc a[href="#${section.id}"]`)?.parentElement?.remove();
      return;
    }
    frames.filter(f => !photos.includes(f)).forEach(f => f.remove());

    let idx = 0;
    let timer = null;
    let resumeTimer = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const multiple = photos.length > 1;

    // Counter and progress bar only make sense for a set, not a lone photo.
    let counter = null;
    let progress = null;
    let progressFill = null;
    if (multiple) {
      counter = document.createElement('div');
      counter.className = 'proj-carousel-count';
      carousel.appendChild(counter);

      progress = document.createElement('div');
      progress.className = 'proj-carousel-progress';
      progressFill = document.createElement('div');
      progressFill.className = 'proj-carousel-progress-fill';
      progress.appendChild(progressFill);
      carousel.appendChild(progress);
    }

    // The bar drains on the same clock as the timer. Restarting it means
    // clearing the transition, forcing a reflow, then re-arming — otherwise
    // the browser coalesces the reset and the replay into no visible change.
    const restartProgress = () => {
      if (!progress || reduced) return;
      progress.classList.add('visible');
      // Reset, force a reflow, then re-arm — otherwise the browser coalesces
      // the reset and the replay into no visible change at all.
      progressFill.style.transition = 'none';
      progressFill.style.transform = 'scaleX(0)';
      void progressFill.offsetWidth;
      progressFill.style.transition = `transform ${ADVANCE_MS}ms linear`;
      progressFill.style.transform = 'scaleX(1)';
    };
    const stopProgress = () => {
      if (!progress) return;
      progress.classList.remove('visible');
      progressFill.style.transition = 'none';
      progressFill.style.transform = 'scaleX(0)';
    };

    const show = i => {
      idx = (i + photos.length) % photos.length;
      photos.forEach((p, n) => p.classList.toggle('active', n === idx));
      if (thumbsWrap) {
        [...thumbsWrap.children].forEach((t, n) => {
          const on = n === idx;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      }
      if (counter) counter.innerHTML = `<b>${idx + 1}</b> / ${photos.length}`;
      if (timer) restartProgress();
    };

    const play = () => {
      if (reduced || !multiple || timer) return;
      timer = setInterval(() => show(idx + 1), ADVANCE_MS);
      restartProgress();
    };
    const pause = () => { clearInterval(timer); timer = null; stopProgress(); };

    // Any manual move stops the auto-advance, then hands control back once the
    // reader has been idle for a while — so it never fights the person using it.
    const goTo = i => {
      pause();
      clearTimeout(resumeTimer);
      show(i);
      resumeTimer = setTimeout(() => { resumeTimer = null; play(); }, RESUME_MS);
    };
    const manual = step => goTo(idx + step);

    if (multiple) {
      // Filmstrip: a real thumbnail per photo, so the reader can see the whole
      // set and jump straight to the one they want.
      photos.forEach((photo, n) => {
        const t = document.createElement('button');
        t.className = 'proj-carousel-thumb';
        t.type = 'button';
        t.setAttribute('role', 'tab');
        t.setAttribute('aria-label', `Photo ${n + 1} of ${photos.length}`);
        const thumb = document.createElement('img');
        thumb.src = photo.currentSrc || photo.src;
        thumb.alt = '';
        t.appendChild(thumb);
        t.addEventListener('click', () => goTo(n));
        thumbsWrap?.appendChild(t);
      });

      const arrow = (dir, label, path) => {
        const b = document.createElement('button');
        b.className = `proj-carousel-nav ${dir}`;
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="${path}"/></svg>`;
        b.addEventListener('click', () => manual(dir === 'prev' ? -1 : 1));
        carousel.appendChild(b);
        return b;
      };
      arrow('prev', 'Previous photo', 'M15 18l-6-6 6-6');
      arrow('next', 'Next photo',     'M9 18l6-6-6-6');

      // hovering holds the current photo; leaving resumes
      carousel.addEventListener('mouseenter', pause);
      carousel.addEventListener('mouseleave', () => { if (!resumeTimer) play(); });

      // arrow keys work once the carousel has been interacted with
      carousel.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); manual(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); manual(1); }
      });

      // don't animate in a background tab
      document.addEventListener('visibilitychange', () => {
        document.hidden ? pause() : (resumeTimer ? null : play());
      });
    }

    show(0);
    play();
  });
}


// Screenshot lightbox
const lightbox = document.getElementById('lightbox');

if (lightbox) {
  const lightboxImg = lightbox.querySelector('img');

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-lightbox]').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
  });

  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
  });
}
