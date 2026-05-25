/* ============================================================
   garvika.bansal — site interactivity
   No dependencies. Vanilla ES2020.
   Modules:
     boot()            — loading sequence
     theme()           — light/dark toggle + persist
     sound()           — Web Audio synth click/hover/blip sounds
     cursor()          — custom cursor (desktop)
     bgCanvas()        — drifting dot grid behind content
     reveals()         — IntersectionObserver fade-up
     counters()        — animate stat numbers
     carousels()       — drag/swipe/buttons/dots/keyboard
     magnets()         — magnetic hover on links/buttons
     ripples()         — click ripple effect
     palette()         — Cmd+K command palette
     shortcuts()       — keyboard shortcuts overlay + global handlers
     clock()           — live IST time in header
     rail()            — right-side section indicator
     navHighlight()    — highlight current section in nav
     photoTilt()       — 3D tilt on hero photo
     easterEgg()       — type ANJAN to trigger
============================================================ */

(() => {
  const $  = (q, ctx=document) => ctx.querySelector(q);
  const $$ = (q, ctx=document) => [...ctx.querySelectorAll(q)];
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;

  /* =========================================================
     SOUND — synthesized via Web Audio API
     Three voices: tick (small click), pop (success), boop (theme)
     User-controllable via S key (toggle mute). Stored in localStorage.
  ========================================================= */
  const Sound = (() => {
    let ctx = null;
    let muted = (() => {
      try { return localStorage.getItem('garvika-muted') === '1'; } catch(e){ return false; }
    })();

    const ensure = () => {
      if (ctx) return ctx;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      } catch(e) { return null; }
      return ctx;
    };

    const blip = (freq=520, dur=0.06, type='sine', vol=0.04, slide=0) => {
      if (muted || prefersReduced) return;
      const ac = ensure(); if (!ac) return;
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(50, freq + slide), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };

    return {
      tick:   () => blip(820,  0.035, 'square', 0.025),
      hover:  () => blip(1100, 0.022, 'sine',   0.015),
      pop:    () => blip(660,  0.06,  'triangle', 0.04, 300),
      boop:   () => blip(420,  0.09,  'sine',   0.05, -120),
      whoosh: () => { blip(220, 0.08, 'sawtooth', 0.025, 800); setTimeout(() => blip(440, 0.05, 'sine', 0.02), 50); },
      err:    () => blip(180, 0.12, 'sawtooth', 0.05, -60),
      setMuted: (v) => { muted = !!v; try { localStorage.setItem('garvika-muted', muted ? '1' : '0'); } catch(e){} },
      isMuted: () => muted,
    };
  })();

  /* =========================================================
     BOOT — funky terminal-style sequence + glitch + log + fade
  ========================================================= */
  const boot = () => {
    document.body.classList.add('boot-pending');
    const fill = $('#boot-fill');
    const log = $('#boot-log');
    const tagRot = $('#boot-tagline-rotate');
    const dur = prefersReduced ? 120 : 1500;

    const logMessages = [
      { text: 'mounting dot field',         cls: 'is-ok' },
      { text: 'arming custom cursor',       cls: 'is-ok' },
      { text: 'warming click sounds',       cls: 'is-ok' },
      { text: 'calibrating magnets',        cls: 'is-ok' },
      { text: 'connecting to kitchen',      cls: 'is-ok' },
      { text: 'compiling carousels',        cls: 'is-ok' },
      { text: 'loading keyboard bindings',  cls: 'is-ok' },
      { text: 'ready to ship.',             cls: 'is-rdy' },
    ];

    const taglines = [
      'CALIBRATING REALITY',
      'COORDINATING WITH COOK',
      'STOCKING THE KITCHEN',
      'TIGHTENING BOLTS',
      'INFLATING MARQUEE',
      'PLANNING THE WEEK',
      'CHARMING COOKIES',
      'TUNING THE ENGINE',
    ];

    // Rotate tagline rapidly until boot completes
    let taglineIdx = 0;
    let taglineTimer = null;
    if (tagRot) {
      taglineTimer = setInterval(() => {
        taglineIdx = (taglineIdx + 1) % taglines.length;
        tagRot.textContent = taglines[taglineIdx];
      }, prefersReduced ? 600 : 200);
    }

    // Stream log messages over the boot window
    let logIdx = 0;
    const logInterval = Math.max(80, Math.floor(dur / (logMessages.length + 1)));
    const logTimer = setInterval(() => {
      if (!log || logIdx >= logMessages.length) { clearInterval(logTimer); return; }
      const m = logMessages[logIdx++];
      const li = document.createElement('li');
      if (m.cls) li.classList.add(m.cls);
      li.textContent = m.text;
      log.appendChild(li);
      Sound.tick();
    }, logInterval);

    // Progress bar
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      if (fill) fill.style.width = (p * 100).toFixed(1) + '%';
      if (p < 1) requestAnimationFrame(step);
      else {
        clearInterval(taglineTimer);
        clearInterval(logTimer);
        if (tagRot) tagRot.textContent = 'WELCOME';
        // Drain remaining log items at end if interval lagged behind dur
        while (logIdx < logMessages.length && log) {
          const m = logMessages[logIdx++];
          const li = document.createElement('li');
          if (m.cls) li.classList.add(m.cls);
          li.textContent = m.text;
          log.appendChild(li);
        }
        setTimeout(() => {
          document.body.classList.add('booted');
          document.body.classList.remove('boot-pending');
          Sound.pop();
        }, 220);
      }
    };
    requestAnimationFrame(step);
  };

  /* =========================================================
     THEME — toggle + persist
  ========================================================= */
  const theme = () => {
    const set = (t, withSound=true) => {
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('garvika-theme', t); } catch(e){}
      if (withSound) Sound.boop();
    };
    const toggle = () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      set(next);
    };
    $('#theme-toggle')?.addEventListener('click', toggle);
    return { toggle };
  };

  /* =========================================================
     CURSOR — dot + ring follow cursor; ring grows on hoverables
  ========================================================= */
  const cursor = () => {
    if (isTouch) return;
    const dot  = $('#cursor-dot');
    const ring = $('#cursor-ring');
    if (!dot || !ring) return;
    let tx = -1000, ty = -1000, rx = -1000, ry = -1000;
    let primed = false;
    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!primed) { rx = tx; ry = ty; primed = true; }
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
    };
    const tick = () => {
      // Strong easing — feels responsive, still smooths jitter
      rx += (tx - rx) * 0.45;
      ry += (ty - ry) * 0.45;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    addEventListener('mousemove', onMove, { passive: true });
    requestAnimationFrame(tick);

    const hoverSel = 'a, button, .card, .photo-slide, .stat, [data-hoverable]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest?.(hoverSel)) {
        if (!document.body.classList.contains('cursor-hover')) {
          document.body.classList.add('cursor-hover');
          Sound.hover();
        }
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest?.(hoverSel) && !e.relatedTarget?.closest?.(hoverSel)) {
        document.body.classList.remove('cursor-hover');
      }
    });
    addEventListener('mousedown', () => document.body.classList.add('cursor-down'));
    addEventListener('mouseup',   () => document.body.classList.remove('cursor-down'));
  };

  /* =========================================================
     BACKGROUND CANVAS — drifting dot grid + cursor glow
  ========================================================= */
  const bgCanvas = () => {
    if (prefersReduced) return;
    const cv = $('#bg-canvas'); if (!cv) return;
    const ctx2 = cv.getContext('2d');
    let w=0, h=0, dpr = Math.min(2, devicePixelRatio || 1);
    let mx = -1000, my = -1000;
    const spacing = 36;
    const dotRadius = 1;
    const reach = 140;

    const resize = () => {
      w = innerWidth; h = innerHeight;
      cv.width  = w * dpr;
      cv.height = h * dpr;
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      ctx2.scale(dpr, dpr);
    };

    const themeColor = () => getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#000';
    const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c84e1f';

    let t0 = performance.now();
    const draw = (now) => {
      const dt = (now - t0) / 1000;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, w, h);
      const base = themeColor();
      const acc  = accentColor();
      // dot grid
      for (let y = spacing/2; y < h; y += spacing) {
        for (let x = spacing/2; x < w; x += spacing) {
          const drift = Math.sin((x + y) * 0.01 + dt * 0.6) * 1.2;
          const px = x + drift;
          const py = y + Math.cos((x - y) * 0.01 + dt * 0.5) * 1.2;
          const dx = px - mx, dy = py - my;
          const d = Math.sqrt(dx*dx + dy*dy);
          const k = Math.max(0, 1 - d / reach);
          const r = dotRadius + k * 2.5;
          ctx2.beginPath();
          ctx2.arc(px, py, r, 0, Math.PI * 2);
          ctx2.fillStyle = k > 0.05 ? acc : base;
          ctx2.globalAlpha = 0.18 + k * 0.6;
          ctx2.fill();
        }
      }
      requestAnimationFrame(draw);
    };

    resize();
    addEventListener('resize', resize);
    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    addEventListener('mouseleave', () => { mx = -1000; my = -1000; });
    requestAnimationFrame(draw);
  };

  /* =========================================================
     REVEAL ON SCROLL
  ========================================================= */
  const reveals = () => {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || prefersReduced) {
      els.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));
  };

  /* =========================================================
     COUNTERS
  ========================================================= */
  const counters = () => {
    const grids = $$('[data-counters]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        $$('.counter', e.target).forEach(node => {
          const to = parseFloat(node.dataset.to);
          const dec = parseInt(node.dataset.decimals || '0', 10);
          const dur = 1200;
          const t0 = performance.now();
          const step = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            const v = (eased * to).toFixed(dec);
            node.textContent = v;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0.3 });
    grids.forEach(g => io.observe(g));
  };

  /* =========================================================
     CAROUSELS
  ========================================================= */
  const carouselRegistry = [];  // exposed for global keyboard nav

  const carousels = () => {
    $$('[data-carousel]').forEach(setup);

    // Global ← → support — find whichever carousel is most visible
    addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      // Skip if any overlay is open (palette uses ↑↓, but ← → would still hijack carousel)
      if ($$('.overlay[aria-hidden="false"]').length) return;

      let best = null, bestScore = 0;
      const vh = innerHeight;
      carouselRegistry.forEach(c => {
        const r = c.root.getBoundingClientRect();
        const visible = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top));
        const score = visible / Math.max(1, Math.min(r.height, vh));
        if (score > bestScore && score > 0.3) { bestScore = score; best = c; }
      });
      if (best) {
        e.preventDefault();
        Sound.tick();
        best.go(best.index() + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });

    function setup(root) {
      const viewport = $('.carousel-viewport', root);
      const track    = $('.carousel-track', root);
      const prev     = $('[data-carousel-prev]', root);
      const next     = $('[data-carousel-next]', root);
      const dotsWrap = $('[data-carousel-dots]', root);
      const slides   = [...track.children];
      let index = 0;

      let dots = [];

      const slideStep = () => {
        const r0 = slides[0].getBoundingClientRect();
        const r1 = (slides[1] || slides[0]).getBoundingClientRect();
        return (r1.left - r0.left) || (r0.width + 16);
      };

      const maxIndex = () => {
        const vw = viewport.getBoundingClientRect().width;
        const sw = slideStep();
        const visible = Math.max(1, Math.floor((vw + 0.5) / sw));
        return Math.max(0, slides.length - visible);
      };

      const rebuildDots = () => {
        const m = maxIndex();
        dotsWrap.innerHTML = '';
        dots = [];
        for (let i = 0; i <= m; i++) {
          const b = document.createElement('button');
          b.className = 'carousel-dot';
          b.setAttribute('aria-label', `Go to page ${i + 1}`);
          b.addEventListener('click', () => { Sound.tick(); go(i); });
          dotsWrap.appendChild(b);
          dots.push(b);
        }
      };

      const update = () => {
        const step = slideStep();
        const m = maxIndex();
        if (index > m) index = m;
        track.style.transform = `translateX(${-(index * step)}px)`;
        dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
        prev.disabled = index <= 0;
        next.disabled = index >= m;
      };

      const go = (i) => {
        const m = maxIndex();
        index = Math.max(0, Math.min(m, i));
        update();
      };

      prev.addEventListener('click', () => { Sound.tick(); go(index - 1); });
      next.addEventListener('click', () => { Sound.tick(); go(index + 1); });

      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); Sound.tick(); go(index - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); Sound.tick(); go(index + 1); }
      });

      // drag / swipe
      let dragging = false, startX = 0, startTransform = 0;
      const getX = (e) => e.touches ? e.touches[0].clientX : e.clientX;
      const startDrag = (e) => {
        dragging = true;
        startX = getX(e);
        const m = (track.style.transform.match(/-?\d+\.?\d*/) || [0])[0];
        startTransform = parseFloat(m) || -(index * slideStep());
        track.style.transition = 'none';
        viewport.classList.add('is-grabbing');
      };
      const onDrag = (e) => {
        if (!dragging) return;
        const dx = getX(e) - startX;
        track.style.transform = `translateX(${startTransform + dx}px)`;
      };
      const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        track.style.transition = '';
        viewport.classList.remove('is-grabbing');
        const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const dx = endX - startX;
        const step = slideStep();
        const delta = Math.round(-dx / step);
        if (Math.abs(dx) > 8) Sound.tick();
        go(index + delta);
      };

      viewport.addEventListener('mousedown', startDrag);
      viewport.addEventListener('touchstart', startDrag, { passive: true });
      addEventListener('mousemove', onDrag, { passive: true });
      addEventListener('touchmove', onDrag,  { passive: true });
      addEventListener('mouseup', endDrag);
      addEventListener('touchend', endDrag);

      let resizeFrame = 0;
      addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => { rebuildDots(); update(); });
      });

      rebuildDots();
      update();

      // Register for global keyboard nav
      carouselRegistry.push({ root, go, index: () => index });
    }
  };

  /* =========================================================
     MAGNETIC HOVER
  ========================================================= */
  const magnets = () => {
    if (isTouch) return;
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * 0.25;
        const dy = (e.clientY - cy) * 0.25;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  };

  /* =========================================================
     CLICK RIPPLES
  ========================================================= */
  const ripples = () => {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button, .card, .photo-slide, .stat, .contact-list li');
      if (!target) return;
      Sound.tick();
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = e.clientX + 'px';
      r.style.top  = e.clientY + 'px';
      r.style.width = '40px';
      r.style.height = '40px';
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 750);
    });
  };

  /* =========================================================
     CLOCK
  ========================================================= */
  const clock = () => {
    const node = $('#clock'); if (!node) return;
    const fmt = () => {
      try {
        const t = new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        node.textContent = `${t} IST`;
      } catch(e) {
        const d = new Date();
        const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        node.textContent = `${t} IST`;
      }
    };
    fmt();
    setInterval(fmt, 30 * 1000);
  };

  /* =========================================================
     RIGHT-RAIL SECTION INDICATOR
  ========================================================= */
  const rail = () => {
    const sections = ['index', 'work', 'ventures', 'edu', 'mountains', 'contact'];
    const labels   = { index: 'INDEX', work: 'WORK', ventures: 'VENTURES', edu: 'EDUCATION', mountains: 'MOUNTAINS', contact: 'CONTACT' };
    const wrap = document.createElement('nav');
    wrap.className = 'rail';
    wrap.setAttribute('aria-label', 'Section indicator');
    sections.forEach((id, i) => {
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.className = 'rail-item';
      a.dataset.id = id;
      a.innerHTML = `<span class="label">${String(i).padStart(2,'0')} · ${labels[id]}</span><span class="pip"></span>`;
      a.addEventListener('click', () => Sound.tick());
      wrap.appendChild(a);
    });
    document.body.appendChild(wrap);

    // Scroll-position-based active detection — reliable for sections taller than viewport
    const updateActive = () => {
      const target = innerHeight * 0.3;  // section is active once its top crosses 30% from top
      let active = sections[0];
      for (const id of sections) {
        const s = document.getElementById(id);
        if (!s) continue;
        const top = s.getBoundingClientRect().top;
        if (top <= target) active = id;
        else break;  // sections are ordered top→bottom in the DOM
      }
      $$('.rail-item.is-active', wrap).forEach(x => x.classList.remove('is-active'));
      wrap.querySelector(`[data-id="${active}"]`)?.classList.add('is-active');
      $$('.site-nav a.is-current').forEach(x => x.classList.remove('is-current'));
      $(`.site-nav a[href="#${active}"]`)?.classList.add('is-current');
    };

    let ticking = false;
    addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => { updateActive(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    addEventListener('resize', () => requestAnimationFrame(updateActive));
    updateActive();
  };

  /* =========================================================
     SCROLL PROGRESS BAR
  ========================================================= */
  const scrollProgress = () => {
    const bar = $('#scroll-progress');
    if (!bar) return;
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = Math.min(1, Math.max(0, scrollY / Math.max(1, max)));
      bar.style.width = (p * 100).toFixed(1) + '%';
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  };

  /* =========================================================
     PHOTO 3D TILT
  ========================================================= */
  const photoTilt = () => {
    if (isTouch || prefersReduced) return;
    const frame = $('.photo-frame');
    const photo = frame?.parentElement;
    if (!frame || !photo) return;
    photo.addEventListener('mousemove', (e) => {
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - (r.left + r.width / 2)) / r.width;
      const py = (e.clientY - (r.top + r.height / 2)) / r.height;
      frame.style.transform = `perspective(800px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateZ(0)`;
    });
    photo.addEventListener('mouseleave', () => { frame.style.transform = ''; });
  };

  /* =========================================================
     COMMAND PALETTE
  ========================================================= */
  const paletteCmds = [
    { id: 'index',     label: 'Go to · 00 / INDEX',       action: () => location.hash = '#index' },
    { id: 'work',      label: 'Go to · 01 / WORK',        action: () => location.hash = '#work' },
    { id: 'ventures',  label: 'Go to · 02 / VENTURES',    action: () => location.hash = '#ventures' },
    { id: 'edu',       label: 'Go to · 03 / EDUCATION',   action: () => location.hash = '#edu' },
    { id: 'mountains', label: 'Go to · 04 / MOUNTAINS',   action: () => location.hash = '#mountains' },
    { id: 'contact',   label: 'Go to · 05 / CONTACT',     action: () => location.hash = '#contact' },
    { id: 'theme',     label: 'Toggle · Light / Dark theme', action: null /* wired later */ },
    { id: 'mute',      label: 'Toggle · Click sounds (mute)', action: null },
    { id: 'shortcuts', label: 'Open · Keyboard shortcuts',    action: null },
    { id: 'bimi',      label: 'Open · Bimi',       action: () => open('https://trybimi.in', '_blank') },
    { id: 'linkedin',  label: 'Open · LinkedIn',   action: () => open('https://www.linkedin.com/in/garvikabansal/', '_blank') },
    { id: 'website',   label: 'Open · Saaja Foods', action: () => open('https://www.saajafoods.com', '_blank') },
  ];

  const palette = (themeApi) => {
    const overlay = $('#palette');
    const input   = $('#palette-input');
    const list    = $('#palette-results');
    if (!overlay || !input || !list) return { open: ()=>{}, close: ()=>{} };

    let active = 0;
    let filtered = [];

    const open = () => {
      overlay.setAttribute('aria-hidden', 'false');
      input.value = '';
      render(paletteCmds);
      requestAnimationFrame(() => input.focus());
      Sound.whoosh();
    };
    const close = () => {
      overlay.setAttribute('aria-hidden', 'true');
      Sound.tick();
    };

    const render = (items) => {
      filtered = items;
      active = 0;
      list.innerHTML = items.map((c, i) => `<li class="${i===0?'is-active':''}" data-i="${i}"><span class="res-id">${String(i).padStart(2,'0')}</span><span>${c.label}</span></li>`).join('');
      $$('li', list).forEach(li => {
        li.addEventListener('mouseenter', () => {
          $$('li', list).forEach(x => x.classList.remove('is-active'));
          li.classList.add('is-active');
          active = parseInt(li.dataset.i, 10);
        });
        li.addEventListener('click', () => commit());
      });
    };

    const commit = () => {
      const cmd = filtered[active];
      if (!cmd) { Sound.err(); return; }
      close();
      // wire dynamic actions
      if (cmd.id === 'theme') return themeApi.toggle();
      if (cmd.id === 'mute')  { Sound.setMuted(!Sound.isMuted()); return Sound.isMuted() ? null : Sound.pop(); }
      if (cmd.id === 'shortcuts') return openShortcuts();
      cmd.action?.();
    };

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      const matches = paletteCmds.filter(c => c.label.toLowerCase().includes(q) || c.id.includes(q));
      render(matches);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % filtered.length; rehighlight(); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); active = (active - 1 + filtered.length) % filtered.length; rehighlight(); }
      else if (e.key === 'Enter')     { e.preventDefault(); commit(); }
      else if (e.key === 'Escape')    { e.preventDefault(); close(); }
    });
    const rehighlight = () => {
      $$('li', list).forEach((x, i) => x.classList.toggle('is-active', i === active));
      Sound.tick();
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
      if (e.target.closest('[data-overlay-close]')) close();
    });

    return { open, close };
  };

  /* =========================================================
     SHORTCUTS OVERLAY
  ========================================================= */
  let openShortcuts, closeShortcuts;
  const shortcutsOverlay = () => {
    const overlay = $('#shortcuts'); if (!overlay) return;
    openShortcuts = () => { overlay.setAttribute('aria-hidden', 'false'); Sound.whoosh(); };
    closeShortcuts = () => { overlay.setAttribute('aria-hidden', 'true'); Sound.tick(); };
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeShortcuts();
      if (e.target.closest('[data-overlay-close]')) closeShortcuts();
    });
  };

  /* =========================================================
     GLOBAL KEYBOARD
  ========================================================= */
  const keyboard = (themeApi, paletteApi) => {
    let lastKey = '';
    let lastTime = 0;
    let buffer = '';

    addEventListener('keydown', (e) => {
      // skip if typing in input
      const tag = e.target.tagName;
      const typingInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      // Cmd+K / Ctrl+K — palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        paletteApi.open();
        return;
      }
      // ESC — close any overlay
      if (e.key === 'Escape') {
        $$('.overlay').forEach(o => o.setAttribute('aria-hidden', 'true'));
        return;
      }

      if (typingInput) return;

      // single-key shortcuts
      if (e.key === '/') { e.preventDefault(); paletteApi.open(); return; }
      if (e.key === '?') { e.preventDefault(); openShortcuts?.(); return; }
      if (e.key.toLowerCase() === 't') { themeApi.toggle(); return; }
      if (e.key.toLowerCase() === 's') {
        Sound.setMuted(!Sound.isMuted());
        if (!Sound.isMuted()) Sound.pop();
        return;
      }

      // G+X jump bindings
      const now = performance.now();
      if (e.key.toLowerCase() === 'g') { lastKey = 'g'; lastTime = now; return; }
      if (lastKey === 'g' && (now - lastTime) < 1500) {
        const map = { i: 'index', w: 'work', v: 'ventures', e: 'edu', m: 'mountains', c: 'contact' };
        const target = map[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          location.hash = `#${target}`;
          Sound.pop();
        }
        lastKey = '';
        return;
      }

      // easter egg buffer
      buffer = (buffer + e.key.toLowerCase()).slice(-20);
      if (buffer.endsWith('bimi') || buffer.endsWith('saaja')) {
        triggerFlash();
        Sound.whoosh();
        buffer = '';
      }
      if (buffer.endsWith('arrowuparrowuparrowdownarrowdownarrowleftarrowrightarrowleftarrowrightba')) {
        triggerFlash(); Sound.pop();
        buffer = '';
      }
    });
  };

  /* =========================================================
     FLASH (easter egg)
  ========================================================= */
  const triggerFlash = () => {
    const f = document.createElement('div');
    f.className = 'flash';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 500);
  };

  /* =========================================================
     SMOOTH ANCHOR SCROLLING (already in CSS, but block default jump bounce)
  ========================================================= */
  const anchors = () => {
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        Sound.tick();
        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
      });
    });
  };

  /* =========================================================
     INIT
  ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    boot();
    const themeApi = theme();
    cursor();
    bgCanvas();
    reveals();
    counters();
    carousels();
    magnets();
    ripples();
    clock();
    rail();
    scrollProgress();
    photoTilt();
    shortcutsOverlay();
    const paletteApi = palette(themeApi);
    keyboard(themeApi, paletteApi);
    anchors();

    // Greet
    if (!prefersReduced) console.log(
      '%c garvika.bansal ',
      'background:#c84e1f;color:#fff;padding:6px 10px;font-family:Space Mono,monospace;letter-spacing:0.1em;',
      '\npress ? for shortcuts · / or ⌘K for palette · T for theme · type SAAJA for a surprise'
    );
  });
})();
