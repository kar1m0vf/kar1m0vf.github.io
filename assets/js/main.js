(function () {
  const root = document.documentElement;
  const siteConfig = window.siteConfig || {};
  const effectsConfig = siteConfig.effects || {};
  const storedTheme = localStorage.getItem('site-theme');
  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const theme = storedTheme || (preferredDark ? 'dark' : 'light');
  root.setAttribute('data-theme', theme);
  const nav = window.navigator || {};
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const saveData = Boolean(connection && connection.saveData);
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
  const forcedPerfLite = effectsConfig.perfLite === true;
  const normalizeAmbientMode = (mode) => (mode === 'off' || mode === 'lite' || mode === 'full' ? mode : 'auto');
  const forcedAmbientMode = normalizeAmbientMode(effectsConfig.ambientParticles);
  const ambientAutoMode = reduceMotionQuery.matches || saveData ? 'off' : lowMemory || lowCpu ? 'lite' : 'full';
  const ambientMode = forcedAmbientMode === 'auto' ? ambientAutoMode : forcedAmbientMode;
  const perfLite = forcedPerfLite || saveData || lowMemory || lowCpu;
  const customCursorEnabled = effectsConfig.customCursor !== false;
  const pointerEffectsEnabled = effectsConfig.pointerEffects !== false;
  const pageTransitionsEnabled = effectsConfig.pageTransitions !== false;
  if (!pageTransitionsEnabled) {
    root.classList.add('page-transitions-off');
  }
  if (perfLite) {
    root.classList.add('perf-lite');
  }
  if (ambientMode === 'lite') {
    root.classList.add('ambient-lite');
  } else if (ambientMode === 'full') {
    root.classList.add('ambient-full');
  }

  const ensureAmbientBackground = () => {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', ensureAmbientBackground, { once: true });
      return;
    }

    if (document.querySelector('.bg-ambient') || ambientMode === 'off') {
      return;
    }

    const ambient = document.createElement('div');
    ambient.className = `bg-ambient is-${ambientMode}`;
    ambient.setAttribute('aria-hidden', 'true');

    const layers =
      ambientMode === 'lite'
        ? ['bg-orb bg-orb-a', 'bg-orb bg-orb-b', 'bg-particles layer-a']
        : ['bg-orb bg-orb-a', 'bg-orb bg-orb-b', 'bg-orb bg-orb-c', 'bg-particles layer-a', 'bg-particles layer-b'];

    layers.forEach((className) => {
      const node = document.createElement('span');
      node.className = className;
      ambient.appendChild(node);
    });

    document.body.prepend(ambient);
  };

  const setupAmbientParticles = () => {
    if (ambientMode === 'off') {
      return;
    }

    const ambient = document.querySelector('.bg-ambient');
    if (!ambient) {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          ensureAmbientBackground();
          setupAmbientParticles();
        },
        { once: true }
      );
      return;
    }

    let canvas = ambient.querySelector('.bg-particles-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'bg-particles-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      ambient.appendChild(canvas);
    }

    const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!context) {
      return;
    }

    ambient.classList.add('has-canvas-particles');
    root.classList.add('ambient-canvas-ready');
    const pointerReactive = ambientMode === 'full' && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !perfLite;

    const config =
      ambientMode === 'lite'
        ? {
            density: 36000,
            minCount: 10,
            maxCount: 24,
            fps: 16,
            speed: 0.17,
            jitter: 0.0038,
            pointerRadius: 112,
            pointerForce: 0.028,
            pointerSwirl: 0.007,
            linkDistance: 0,
            maxLinksPerParticle: 0,
            dotMin: 0.8,
            dotMax: 1.35,
          }
        : {
            density: 17500,
            minCount: 30,
            maxCount: 74,
            fps: 30,
            speed: 0.24,
            jitter: 0.0054,
            pointerRadius: 132,
            pointerForce: 0.044,
            pointerSwirl: 0.012,
            linkDistance: 64,
            maxLinksPerParticle: 4,
            dotMin: 0.8,
            dotMax: 1.6,
          };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let rafId = 0;
    let lastTick = 0;
    let themeKey = '';
    let themeColor = { dot: '31, 86, 181', line: '31, 86, 181' };
    const smooth = (from, to, amount) => from + (to - from) * amount;
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      active: false,
      lastMove: 0,
      influence: 0,
      targetInfluence: 0,
    };

    const updateThemeColor = () => {
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      if (nextTheme === themeKey) {
        return;
      }

      themeKey = nextTheme;
      themeColor =
        nextTheme === 'dark'
          ? { dot: '139, 169, 223', line: '139, 169, 223' }
          : { dot: '31, 86, 181', line: '31, 86, 181' };
    };

    const randomBetween = (min, max) => min + Math.random() * (max - min);

    const createParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: randomBetween(-config.speed, config.speed),
      vy: randomBetween(-config.speed, config.speed),
      wobble: randomBetween(0.65, 1.25),
      phase: randomBetween(0, Math.PI * 2),
      size: randomBetween(config.dotMin, config.dotMax),
      alpha: randomBetween(themeKey === 'dark' ? 0.22 : 0.24, themeKey === 'dark' ? 0.62 : 0.7),
    });

    const syncParticleCount = () => {
      const targetCount = Math.max(
        config.minCount,
        Math.min(config.maxCount, Math.round((Math.max(width, 1) * Math.max(height, 1)) / config.density))
      );

      if (particles.length > targetCount) {
        particles.length = targetCount;
        return;
      }

      while (particles.length < targetCount) {
        particles.push(createParticle());
      }
    };

    const resizeCanvas = () => {
      const rect = ambient.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      syncParticleCount();
    };

    const stepParticles = (delta) => {
      const pointerRadiusSq = config.pointerRadius * config.pointerRadius;
      if (pointer.active || pointer.influence > 0.01) {
        const pointerEase = Math.min(0.16 * delta, 0.42);
        pointer.x = smooth(pointer.x, pointer.targetX, pointerEase);
        pointer.y = smooth(pointer.y, pointer.targetY, pointerEase);
      }

      particles.forEach((particle) => {
        particle.phase += 0.011 * particle.wobble * delta;
        particle.vx += Math.sin(particle.phase) * config.jitter * delta;
        particle.vy += Math.cos(particle.phase * 1.12) * config.jitter * delta;

        if (pointer.influence > 0.01) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 0.0001 && distSq < pointerRadiusSq) {
            const dist = Math.sqrt(distSq);
            const influence = 1 - dist / config.pointerRadius;
            const eased = influence * influence;
            const nx = dx / dist;
            const ny = dy / dist;
            const attract = eased * config.pointerForce * delta * pointer.influence;
            const swirl = eased * config.pointerSwirl * delta * pointer.influence;
            particle.vx += nx * attract - ny * swirl;
            particle.vy += ny * attract + nx * swirl;
          }
        }

        particle.vx *= 0.99;
        particle.vy *= 0.99;
        const maxVelocity = config.speed * 1.85;
        const velocitySq = particle.vx * particle.vx + particle.vy * particle.vy;
        if (velocitySq > maxVelocity * maxVelocity) {
          const ratio = maxVelocity / Math.sqrt(velocitySq);
          particle.vx *= ratio;
          particle.vy *= ratio;
        } else if (velocitySq < 0.0006) {
          // Keep particles alive after interactions so they do not visually freeze.
          particle.vx += Math.sin(particle.phase * 1.7) * 0.0038;
          particle.vy += Math.cos(particle.phase * 1.5) * 0.0038;
        }
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        if (particle.x < -12) particle.x = width + 12;
        if (particle.x > width + 12) particle.x = -12;
        if (particle.y < -12) particle.y = height + 12;
        if (particle.y > height + 12) particle.y = -12;
      });
    };

    const drawParticles = () => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        context.fillStyle = `rgba(${themeColor.dot}, ${particle.alpha.toFixed(3)})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      });

      if (config.linkDistance <= 0) {
        return;
      }

      const maxDistanceSq = config.linkDistance * config.linkDistance;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        let linksForParticle = 0;
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= maxDistanceSq) {
            continue;
          }

          const alphaBase = themeKey === 'dark' ? 0.16 : 0.13;
          const linkAlpha = (1 - distSq / maxDistanceSq) * alphaBase;
          context.strokeStyle = `rgba(${themeColor.line}, ${linkAlpha.toFixed(3)})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();

          linksForParticle += 1;
          if (linksForParticle >= config.maxLinksPerParticle) {
            break;
          }
        }
      }
    };

    const frameInterval = 1000 / config.fps;
    const animate = (now) => {
      rafId = window.requestAnimationFrame(animate);
      if (document.hidden) {
        lastTick = now;
        return;
      }

      if (!lastTick) {
        lastTick = now;
      }

      const elapsed = now - lastTick;
      if (elapsed < frameInterval) {
        return;
      }

      lastTick = now;
      updateThemeColor();
      const delta = Math.min(elapsed / 16.666, 2.4);
      if (pointer.active && now - pointer.lastMove > 180) {
        pointer.targetInfluence = 0;
      }

      pointer.influence = smooth(pointer.influence, pointer.targetInfluence, Math.min(0.2 * delta, 0.36));
      if (pointer.influence < 0.015 && pointer.targetInfluence === 0) {
        pointer.active = false;
      }

      stepParticles(delta);
      drawParticles();
    };

    const handlePointerMove = (event) => {
      if (!pointerReactive) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
      if (!pointer.active) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
      pointer.active = true;
      pointer.lastMove = performance.now();
      pointer.targetInfluence = 1;
    };

    const stopPointerEffect = () => {
      pointer.targetInfluence = 0;
    };

    updateThemeColor();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    if (pointerReactive) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerdown', handlePointerMove, { passive: true });
      window.addEventListener('pointerleave', stopPointerEffect, { passive: true });
      window.addEventListener('blur', stopPointerEffect);
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        lastTick = 0;
      }
    });

    if (!rafId) {
      rafId = window.requestAnimationFrame(animate);
    }
  };

  const applyConfig = () => {
    const config = window.siteConfig || {};

    document.querySelectorAll('[data-site-name]').forEach((node) => {
      node.textContent = config.name || 'Kamil Kerimov';
    });

    document.querySelectorAll('[data-site-brand]').forEach((node) => {
      node.textContent = config.brand || config.name || 'Kamil Kerimov';
    });

    document.querySelectorAll('[data-site-initials]').forEach((node) => {
      node.textContent = config.initials || 'KK.';
    });

    document.querySelectorAll('[data-site-role-line]').forEach((node) => {
      node.textContent = config.roleLine || 'Full-Stack Web Developer';
    });

    const map = [
      ['email', 'emailHref'],
      ['telegram', 'telegramHref'],
      ['github', 'githubHref'],
      ['linkedin', 'linkedinHref'],
      ['resumeLabel', 'resumeHref'],
    ];

    map.forEach(([textKey, hrefKey]) => {
      document.querySelectorAll(`[data-site-${textKey}]`).forEach((node) => {
        node.textContent = config[textKey] || '';
      });

      document.querySelectorAll(`[data-site-${hrefKey}]`).forEach((node) => {
        node.setAttribute('href', config[hrefKey] || 'contact.html');
      });
    });
  };

  const updateThemeLabel = () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const nextModeLabel = isDark ? 'Light mode' : 'Dark mode';

    document.querySelectorAll('[data-theme-label]').forEach((node) => {
      node.textContent = nextModeLabel;
    });

    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  };

  const setTheme = (next) => {
    root.setAttribute('data-theme', next);
    localStorage.setItem('site-theme', next);
    updateThemeLabel();
  };

  const toggleTheme = () => {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';

    const canAnimateTheme =
      !reduceMotionQuery.matches &&
      typeof document.startViewTransition === 'function' &&
      !root.classList.contains('theme-transition-running');

    if (!canAnimateTheme) {
      setTheme(next);
      return;
    }

    root.classList.add('theme-transition-running');
    const transition = document.startViewTransition(() => {
      setTheme(next);
    });

    transition.finished.finally(() => {
      root.classList.remove('theme-transition-running');
    });
  };

  document.querySelectorAll('.theme-toggle').forEach((button) => {
    button.addEventListener('click', toggleTheme);
  });

  const topbar = document.querySelector('.topbar');
  const menuToggle = document.querySelector('.menu-toggle');
  if (topbar && menuToggle) {
    const closeMenu = () => {
      topbar.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    };

    const toggleMenu = () => {
      const isOpen = topbar.classList.toggle('menu-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    };

    menuToggle.addEventListener('click', () => {
      toggleMenu();
    });

    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    document.addEventListener('click', (event) => {
      if (!topbar.classList.contains('menu-open')) {
        return;
      }

      if (!topbar.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && topbar.classList.contains('menu-open')) {
        closeMenu();
      }
    });
  }

  const setupCommandPalette = () => {
    if (!document.body) {
      return;
    }

    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.hidden = true;
    palette.setAttribute('aria-hidden', 'true');
    palette.innerHTML = `
      <button class="command-palette-backdrop" type="button" aria-label="Close command palette"></button>
      <section class="command-palette-panel" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
        <div class="command-palette-head">
          <strong id="command-palette-title" class="command-palette-title">Command Palette</strong>
          <span class="command-palette-kbd" data-command-hotkey>Ctrl K</span>
        </div>
        <div class="command-palette-input-wrap">
          <input class="command-palette-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search commands..." aria-label="Search commands" />
        </div>
        <div class="command-palette-list" role="listbox" aria-label="Command results"></div>
        <p class="command-palette-empty" hidden>No matches found.</p>
      </section>
    `;
    document.body.appendChild(palette);

    const panel = palette.querySelector('.command-palette-panel');
    const backdrop = palette.querySelector('.command-palette-backdrop');
    const input = palette.querySelector('.command-palette-input');
    const list = palette.querySelector('.command-palette-list');
    const empty = palette.querySelector('.command-palette-empty');
    const hotkeyNode = palette.querySelector('[data-command-hotkey]');
    if (!panel || !backdrop || !input || !list || !empty) {
      palette.remove();
      return;
    }

    const isMac = /Mac|iPhone|iPad|iPod/i.test(window.navigator.platform || '');
    if (hotkeyNode) {
      hotkeyNode.textContent = isMac ? 'Cmd K' : 'Ctrl K';
    }

    const config = window.siteConfig || {};
    const resumeHref = String(config.resumeHref || 'assets/resume/kamilkarimovcv.pdf');
    const emailHref = String(config.emailHref || (config.email ? `mailto:${config.email}` : 'mailto:hello@example.com'));
    const githubHref = String(config.githubHref || '');
    const telegramHref = String(config.telegramHref || '');

    const navigateTo = (href) => {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        window.location.href = url.href;
        return;
      }

      const current = new URL(window.location.href);
      if (url.pathname === current.pathname && url.hash === current.hash) {
        return;
      }
      window.location.href = url.href;
    };

    const openExternal = (href) => {
      if (!href) {
        return;
      }
      window.open(href, '_blank', 'noopener,noreferrer');
    };

    const commands = [
      {
        label: 'Go to Home',
        meta: 'Navigation',
        hint: 'index.html',
        search: 'home main landing index',
        run: () => navigateTo('index.html'),
      },
      {
        label: 'Go to About',
        meta: 'Navigation',
        hint: 'about.html',
        search: 'about profile bio',
        run: () => navigateTo('about.html'),
      },
      {
        label: 'Go to Projects',
        meta: 'Navigation',
        hint: 'projects.html',
        search: 'projects portfolio work case studies',
        run: () => navigateTo('projects.html'),
      },
      {
        label: 'Go to Contact',
        meta: 'Navigation',
        hint: 'contact.html',
        search: 'contact hire inquiry',
        run: () => navigateTo('contact.html'),
      },
      {
        label: 'Toggle Theme',
        meta: 'Appearance',
        hint: 'Light / Dark',
        search: 'theme appearance dark light mode',
        run: () => toggleTheme(),
      },
      {
        label: 'Download CV',
        meta: 'Profile',
        hint: resumeHref,
        search: 'resume cv pdf download',
        run: () => openExternal(resumeHref),
      },
      {
        label: 'Send Email',
        meta: 'Contact',
        hint: config.email || 'mailto',
        search: 'email mail contact',
        run: () => {
          window.location.href = emailHref;
        },
      },
    ];

    if (githubHref) {
      commands.push({
        label: 'Open GitHub',
        meta: 'Social',
        hint: config.github || 'GitHub',
        search: 'github code repository profile',
        run: () => openExternal(githubHref),
      });
    }

    if (telegramHref) {
      commands.push({
        label: 'Open Telegram',
        meta: 'Social',
        hint: config.telegram || 'Telegram',
        search: 'telegram chat message',
        run: () => openExternal(telegramHref),
      });
    }

    let open = false;
    let closeTimer = 0;
    let activeIndex = 0;
    let filtered = commands.slice();
    let previouslyFocused = null;

    const clearCloseTimer = () => {
      if (!closeTimer) {
        return;
      }
      window.clearTimeout(closeTimer);
      closeTimer = 0;
    };

    const normalize = (value) => String(value || '').trim().toLowerCase();

    const renderCommands = () => {
      const query = normalize(input.value);
      filtered = commands.filter((command) => {
        if (!query) {
          return true;
        }
        const haystack = `${normalize(command.label)} ${normalize(command.meta)} ${normalize(command.hint)} ${normalize(
          command.search
        )}`;
        return haystack.includes(query);
      });

      if (activeIndex >= filtered.length) {
        activeIndex = Math.max(0, filtered.length - 1);
      }

      if (!filtered.length) {
        list.replaceChildren();
        empty.hidden = false;
        return;
      }

      empty.hidden = true;
      const fragment = document.createDocumentFragment();
      filtered.forEach((command, index) => {
        const button = document.createElement('button');
        button.className = 'command-palette-item';
        button.type = 'button';
        button.dataset.commandIndex = String(index);
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(index === activeIndex));
        if (index === activeIndex) {
          button.classList.add('is-active');
        }

        const main = document.createElement('span');
        main.className = 'command-palette-item-main';
        const label = document.createElement('span');
        label.className = 'command-palette-item-label';
        label.textContent = command.label;
        const meta = document.createElement('span');
        meta.className = 'command-palette-item-meta';
        meta.textContent = command.meta;
        main.append(label, meta);

        const hint = document.createElement('span');
        hint.className = 'command-palette-item-hint';
        hint.textContent = command.hint;

        button.append(main, hint);
        fragment.appendChild(button);
      });

      list.replaceChildren(fragment);
      const activeNode = list.querySelector('.command-palette-item.is-active');
      if (activeNode) {
        activeNode.scrollIntoView({ block: 'nearest' });
      }
    };

    const executeCommand = (index) => {
      const command = filtered[index];
      if (!command) {
        return;
      }
      closePalette({ restoreFocus: false, immediate: true });
      command.run();
    };

    const openPalette = () => {
      if (open) {
        return;
      }

      clearCloseTimer();
      open = true;
      previouslyFocused = document.activeElement;
      palette.hidden = false;
      palette.setAttribute('aria-hidden', 'false');
      document.body.classList.add('command-palette-open');
      input.value = '';
      activeIndex = 0;
      renderCommands();
      window.requestAnimationFrame(() => {
        palette.classList.add('is-open');
        input.focus({ preventScroll: true });
      });
    };

    const closePalette = ({ restoreFocus = true, immediate = false } = {}) => {
      if (!open) {
        return;
      }

      clearCloseTimer();
      open = false;
      palette.classList.remove('is-open');
      palette.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('command-palette-open');

      const finalize = () => {
        clearCloseTimer();
        palette.hidden = true;
        if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus({ preventScroll: true });
        }
        previouslyFocused = null;
      };

      if (immediate || reduceMotionQuery.matches) {
        finalize();
        return;
      }

      closeTimer = window.setTimeout(finalize, 180);
    };

    const isTypingContext = (target) => {
      if (!target) {
        return false;
      }
      const element = target instanceof Element ? target : null;
      if (!element) {
        return false;
      }
      return Boolean(
        element.closest('input, textarea, select, [contenteditable="true"]') ||
          (element instanceof HTMLElement && element.isContentEditable)
      );
    };

    backdrop.addEventListener('click', () => {
      closePalette();
    });

    list.addEventListener('click', (event) => {
      const option = event.target.closest('[data-command-index]');
      if (!option) {
        return;
      }
      executeCommand(Number(option.dataset.commandIndex));
    });

    list.addEventListener('mouseover', (event) => {
      const option = event.target.closest('[data-command-index]');
      if (!option) {
        return;
      }
      const nextIndex = Number(option.dataset.commandIndex);
      if (!Number.isFinite(nextIndex) || nextIndex === activeIndex) {
        return;
      }
      activeIndex = nextIndex;
      renderCommands();
    });

    input.addEventListener('input', () => {
      activeIndex = 0;
      renderCommands();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!filtered.length) {
          return;
        }
        activeIndex = (activeIndex + 1) % filtered.length;
        renderCommands();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!filtered.length) {
          return;
        }
        activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
        renderCommands();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        executeCommand(activeIndex);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
      }
    });

    document.addEventListener('keydown', (event) => {
      const key = String(event.key || '').toLowerCase();
      const hotkeyPressed = (event.ctrlKey || event.metaKey) && key === 'k';
      if (hotkeyPressed) {
        event.preventDefault();
        if (open) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (!open && key === '/' && !event.altKey && !event.ctrlKey && !event.metaKey && !isTypingContext(event.target)) {
        event.preventDefault();
        openPalette();
        return;
      }

      if (open && event.key === 'Escape') {
        event.preventDefault();
        closePalette();
      }
    });
  };

  setupCommandPalette();

  const revealItems = document.querySelectorAll('.reveal');
  const cleanupRevealClasses = (item) => {
    item.classList.remove('reveal', 'delay-1', 'delay-2', 'delay-3');
  };

  const scheduleRevealCleanup = (item) => {
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) {
        return;
      }

      cleaned = true;
      cleanupRevealClasses(item);
    };

    item.addEventListener(
      'transitionend',
      (event) => {
        if (event.propertyName === 'opacity' || event.propertyName === 'transform') {
          cleanup();
        }
      },
      { once: true }
    );

    // Fallback: finalize even if transitionend does not fire in some edge cases.
    window.setTimeout(cleanup, 900);
  };

  if ('IntersectionObserver' in window && revealItems.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            scheduleRevealCleanup(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => {
      item.classList.add('is-visible');
      cleanupRevealClasses(item);
    });
  }

  const setupProjectShowcase = () => {
    const projectGrid = document.querySelector('[data-project-grid]');
    if (!projectGrid) {
      return;
    }

    const projectCards = Array.from(projectGrid.querySelectorAll('[data-project-card]'));
    if (!projectCards.length) {
      return;
    }

    const controls = document.querySelector('[data-project-controls]');
    const filterButtons = controls ? Array.from(controls.querySelectorAll('[data-project-filter]')) : [];
    const sortSelect = controls ? controls.querySelector('[data-project-sort]') : null;
    const sortMenu = controls ? controls.querySelector('[data-sort-menu]') : null;
    const sortTrigger = sortMenu ? sortMenu.querySelector('[data-sort-trigger]') : null;
    const sortCurrent = sortMenu ? sortMenu.querySelector('[data-sort-current]') : null;
    const sortList = sortMenu ? sortMenu.querySelector('[data-sort-list]') : null;
    const sortOptions = sortMenu ? Array.from(sortMenu.querySelectorAll('[data-sort-option]')) : [];
    const emptyState = document.querySelector('[data-project-empty]');
    const projectModal = document.querySelector('[data-project-modal]');
    const projectModalCard = projectModal ? projectModal.querySelector('[data-project-modal-card]') : null;
    const projectModalContent = projectModal ? projectModal.querySelector('[data-project-modal-content]') : null;
    const projectModalCloseButtons = projectModal
      ? Array.from(projectModal.querySelectorAll('[data-project-modal-close]'))
      : [];

    const initialOrder = new Map(
      projectCards.map((card, index) => [card, Number(card.dataset.order || index + 1)])
    );

    let activeFilter = 'all';
    let activeSort = sortSelect ? sortSelect.value : 'featured';
    let isUpdating = false;
    let activeModalCard = null;
    let modalPreviouslyFocused = null;
    let modalCloseTimer = 0;
    let modalOpenAnimation = null;
    let activeBlasterArena = null;
    let activeBlasterEnemyCount = 0;
    let blasterResizeFrame = 0;

    let closeProjectModal = () => {};
    let openProjectModal = () => {};
    const setProjectModalScrollLock = (isLocked) => {
      if (isLocked) {
        const scrollbarOffset = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.body.style.setProperty('--project-modal-scrollbar-offset', `${scrollbarOffset}px`);
        document.body.classList.add('project-modal-open');
        return;
      }

      document.body.classList.remove('project-modal-open');
      document.body.style.removeProperty('--project-modal-scrollbar-offset');
    };
    const clearModalCloseTimer = () => {
      if (!modalCloseTimer) {
        return;
      }

      window.clearTimeout(modalCloseTimer);
      modalCloseTimer = 0;
    };
    const stopModalOpenAnimation = () => {
      if (!modalOpenAnimation) {
        if (projectModalCard) {
          projectModalCard.classList.remove('is-zooming');
        }
        return;
      }

      modalOpenAnimation.cancel();
      modalOpenAnimation = null;
      if (projectModalCard) {
        projectModalCard.classList.remove('is-zooming');
      }
    };
    const getModalBlasterEnemyCount = () => {
      const modalWidth = projectModalCard ? projectModalCard.clientWidth : window.innerWidth;
      if (modalWidth <= 560) {
        return 4;
      }
      if (modalWidth <= 780) {
        return 5;
      }
      if (modalWidth <= 1040) {
        return 6;
      }
      return 7;
    };
    const renderModalBlasterEnemies = (arena, enemyCount) => {
      if (!arena) {
        return;
      }

      arena.querySelectorAll('.enemy').forEach((enemyNode) => enemyNode.remove());
      const fragment = document.createDocumentFragment();

      for (let index = 0; index < enemyCount; index += 1) {
        const lane = (index + 1) / (enemyCount + 1);
        const row = index % 3;
        const rowLevel = Math.floor(index / 3);
        const enemy = document.createElement('span');
        enemy.className = 'enemy dynamic-enemy';

        const posX = 10 + lane * 80 + (index % 2 === 0 ? -2.2 : 2.2);
        const posY = 10 + row * 9 + rowLevel * 3;
        const drift = 18 + (index % 4) * 6 + rowLevel * 2;
        const patrolDuration = 3.1 + (index % 5) * 0.32;
        const floatDuration = 1.5 + (index % 4) * 0.22;
        enemy.style.setProperty('--enemy-x', `${Math.max(8, Math.min(92, posX)).toFixed(2)}%`);
        enemy.style.setProperty('--enemy-y', `${posY}px`);
        enemy.style.setProperty('--enemy-drift', `${drift}px`);
        enemy.style.setProperty('--enemy-patrol', `${patrolDuration.toFixed(2)}s`);
        enemy.style.setProperty('--enemy-float', `${floatDuration.toFixed(2)}s`);
        enemy.style.setProperty('--enemy-delay', `${(index * 0.11).toFixed(2)}s`);
        enemy.style.setProperty('--enemy-pulse-delay', `${((index % 3) * 0.14).toFixed(2)}s`);

        const isShooter = (index + enemyCount) % 2 === 0 || (enemyCount >= 6 && index === enemyCount - 1);
        if (isShooter) {
          const shotDuration = 1.18 + (index % 4) * 0.14;
          const shotDistance = 84 + (index % 3) * 12 + rowLevel * 4;
          enemy.classList.add('is-shooter');
          enemy.style.setProperty('--enemy-shot-duration', `${shotDuration.toFixed(2)}s`);
          enemy.style.setProperty('--enemy-shot-delay', `${(index * 0.22).toFixed(2)}s`);
          enemy.style.setProperty('--enemy-shot-distance', `${shotDistance}px`);
        }

        fragment.appendChild(enemy);
      }

      arena.appendChild(fragment);
    };
    const setupModalBlasterPreview = () => {
      activeBlasterArena = null;
      activeBlasterEnemyCount = 0;
      if (!projectModalContent) {
        return;
      }

      const arena = projectModalContent.querySelector('.preview-blaster .preview-arena');
      if (!arena) {
        return;
      }

      const enemyCount = getModalBlasterEnemyCount();
      renderModalBlasterEnemies(arena, enemyCount);
      activeBlasterArena = arena;
      activeBlasterEnemyCount = enemyCount;
    };
    const refreshModalBlasterPreview = () => {
      if (projectModal.hidden || !activeBlasterArena) {
        return;
      }

      const nextCount = getModalBlasterEnemyCount();
      if (nextCount === activeBlasterEnemyCount) {
        return;
      }

      renderModalBlasterEnemies(activeBlasterArena, nextCount);
      activeBlasterEnemyCount = nextCount;
    };

    const getTags = (card) =>
      String(card.dataset.tags || '')
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

    const shouldIgnoreCardOpen = (target) =>
      Boolean(target && target.closest('a, button, input, select, textarea, label'));

    const getSortLabel = (value) => {
      if (sortSelect) {
        const nativeOption = Array.from(sortSelect.options).find((option) => option.value === value);
        if (nativeOption) {
          return nativeOption.textContent || 'Featured';
        }
      }

      const customOption = sortOptions.find((button) => button.dataset.sortOption === value);
      if (customOption) {
        return customOption.textContent || 'Featured';
      }

      return 'Featured';
    };

    const closeSortMenu = () => {
      if (!sortMenu || !sortTrigger || !sortList) {
        return;
      }

      sortMenu.classList.remove('is-open');
      sortTrigger.setAttribute('aria-expanded', 'false');
      sortList.hidden = true;
    };

    const openSortMenu = () => {
      if (!sortMenu || !sortTrigger || !sortList) {
        return;
      }

      sortMenu.classList.add('is-open');
      sortTrigger.setAttribute('aria-expanded', 'true');
      sortList.hidden = false;
    };

    const updateSortState = () => {
      if (sortSelect && sortSelect.value !== activeSort) {
        sortSelect.value = activeSort;
      }

      if (sortCurrent) {
        sortCurrent.textContent = getSortLabel(activeSort);
      }

      sortOptions.forEach((button) => {
        const isActive = button.dataset.sortOption === activeSort;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
    };

    const updateControlsState = () => {
      filterButtons.forEach((button) => {
        const isActive = button.dataset.projectFilter === activeFilter;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      updateSortState();
    };

    const sortByMode = (a, b) => {
      if (activeSort === 'title') {
        return String(a.dataset.title || '').localeCompare(String(b.dataset.title || ''), undefined, {
          sensitivity: 'base',
        });
      }

      if (activeSort === 'stack') {
        const firstTagA = getTags(a)[0] || '';
        const firstTagB = getTags(b)[0] || '';
        const stackSort = firstTagA.localeCompare(firstTagB, undefined, { sensitivity: 'base' });
        if (stackSort !== 0) {
          return stackSort;
        }
      }

      return (initialOrder.get(a) || 0) - (initialOrder.get(b) || 0);
    };

    const applyGridState = () => {
      const visibleCards = projectCards
        .filter((card) => activeFilter === 'all' || getTags(card).includes(activeFilter))
        .sort(sortByMode);
      const visibleSet = new Set(visibleCards);
      const hiddenCards = projectCards
        .filter((card) => !visibleSet.has(card))
        .sort((a, b) => (initialOrder.get(a) || 0) - (initialOrder.get(b) || 0));

      [...visibleCards, ...hiddenCards].forEach((card) => {
        projectGrid.appendChild(card);
      });

      visibleCards.forEach((card, index) => {
        const indexNode = card.querySelector('.project-index');
        if (indexNode) {
          indexNode.textContent = String(index + 1).padStart(2, '0');
        }
      });

      projectCards.forEach((card) => {
        const isVisible = visibleSet.has(card);
        card.hidden = !isVisible;
        card.setAttribute('aria-hidden', String(!isVisible));
      });

      if (activeModalCard && !visibleSet.has(activeModalCard)) {
        closeProjectModal({ restoreFocus: false, immediate: true });
      }

      if (emptyState) {
        emptyState.hidden = visibleCards.length > 0;
      }

      updateControlsState();
    };

    const runGridUpdate = () => {
      if (isUpdating) {
        applyGridState();
        return;
      }

      const useViewTransition =
        typeof document.startViewTransition === 'function' && !reduceMotionQuery.matches;

      if (useViewTransition) {
        isUpdating = true;
        const transition = document.startViewTransition(() => {
          applyGridState();
        });

        transition.finished.finally(() => {
          isUpdating = false;
        });
        return;
      }

      projectGrid.classList.add('is-updating');
      applyGridState();
      window.setTimeout(() => {
        projectGrid.classList.remove('is-updating');
      }, 180);
    };

    if (projectModal && projectModalCard && projectModalContent) {
      const animateModalFromCard = (card) => {
        if (reduceMotionQuery.matches) {
          return;
        }

        const sourceRect = card.getBoundingClientRect();
        const targetRect = projectModalCard.getBoundingClientRect();
        if (sourceRect.width < 8 || sourceRect.height < 8 || targetRect.width < 8 || targetRect.height < 8) {
          return;
        }

        const startScaleX = Math.min(Math.max(sourceRect.width / targetRect.width, 0.2), 1.15);
        const startScaleY = Math.min(Math.max(sourceRect.height / targetRect.height, 0.2), 1.15);
        const startTranslateX =
          sourceRect.left + sourceRect.width / 2 - (targetRect.left + targetRect.width / 2);
        const startTranslateY =
          sourceRect.top + sourceRect.height / 2 - (targetRect.top + targetRect.height / 2);

        stopModalOpenAnimation();
        projectModalCard.classList.add('is-zooming');
        modalOpenAnimation = projectModalCard.animate(
          [
            {
              transform: `translate3d(${startTranslateX.toFixed(2)}px, ${startTranslateY.toFixed(
                2
              )}px, 0) scale(${startScaleX.toFixed(4)}, ${startScaleY.toFixed(4)})`,
              opacity: 0.2,
              filter: 'blur(2px)',
            },
            {
              transform: 'translate3d(0, 0, 0) scale(1, 1)',
              opacity: 1,
              filter: 'blur(0px)',
            },
          ],
          {
            duration: 440,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }
        );

        modalOpenAnimation.addEventListener(
          'finish',
          () => {
            modalOpenAnimation = null;
            projectModalCard.classList.remove('is-zooming');
          },
          { once: true }
        );
        modalOpenAnimation.addEventListener(
          'cancel',
          () => {
            modalOpenAnimation = null;
            projectModalCard.classList.remove('is-zooming');
          },
          { once: true }
        );
      };

      const fillModalFromCard = (card) => {
        const nodes = ['.project-top', '.project-preview', '.gold-line', '.project-copy', '.project-links']
          .map((selector) => card.querySelector(selector))
          .filter(Boolean)
          .map((node) => node.cloneNode(true));

        projectModalContent.replaceChildren(...nodes);

        const titleNode = projectModalContent.querySelector('h3');
        if (titleNode) {
          titleNode.id = 'project-modal-title';
          projectModalCard.setAttribute('aria-labelledby', 'project-modal-title');
        } else {
          projectModalCard.removeAttribute('aria-labelledby');
        }
      };

      closeProjectModal = ({ restoreFocus = true, immediate = false } = {}) => {
        if (projectModal.hidden && !projectModal.classList.contains('is-open')) {
          return;
        }

        clearModalCloseTimer();
        stopModalOpenAnimation();
        projectModal.setAttribute('aria-hidden', 'true');
        const finalizeClose = () => {
          clearModalCloseTimer();
          stopModalOpenAnimation();
          projectModal.classList.remove('is-open');
          projectModal.hidden = true;
          setProjectModalScrollLock(false);
          activeBlasterArena = null;
          activeBlasterEnemyCount = 0;
          projectModalContent.replaceChildren();
          activeModalCard = null;

          if (restoreFocus && modalPreviouslyFocused && typeof modalPreviouslyFocused.focus === 'function') {
            modalPreviouslyFocused.focus({ preventScroll: true });
          }
          modalPreviouslyFocused = null;
        };

        projectModal.classList.remove('is-open');
        if (immediate || reduceMotionQuery.matches) {
          finalizeClose();
          return;
        }

        modalCloseTimer = window.setTimeout(finalizeClose, 220);
      };

      openProjectModal = (card) => {
        clearModalCloseTimer();
        stopModalOpenAnimation();
        fillModalFromCard(card);
        setupModalBlasterPreview();
        activeModalCard = card;
        modalPreviouslyFocused = document.activeElement;

        projectModal.hidden = false;
        projectModal.setAttribute('aria-hidden', 'false');
        setProjectModalScrollLock(true);

        window.requestAnimationFrame(() => {
          projectModal.classList.add('is-open');
          window.requestAnimationFrame(() => {
            animateModalFromCard(card);
          });
          projectModalCard.focus({ preventScroll: true });
        });
      };

      window.addEventListener(
        'resize',
        () => {
          if (blasterResizeFrame) {
            return;
          }

          blasterResizeFrame = window.requestAnimationFrame(() => {
            blasterResizeFrame = 0;
            refreshModalBlasterPreview();
          });
        },
        { passive: true }
      );

      projectModalCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
          closeProjectModal();
        });
      });

      document.addEventListener('keydown', (event) => {
        if (projectModal.hidden) {
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          closeProjectModal();
          return;
        }

        if (event.key !== 'Tab') {
          return;
        }

        const focusables = Array.from(
          projectModalCard.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
        ).filter((element) => element.offsetParent !== null);

        if (!focusables.length) {
          event.preventDefault();
          projectModalCard.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    }

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextFilter = button.dataset.projectFilter || 'all';
        if (nextFilter === activeFilter) {
          return;
        }

        activeFilter = nextFilter;
        runGridUpdate();
      });
    });

    const applySortValue = (value) => {
      const nextValue = String(value || 'featured');
      if (nextValue === activeSort) {
        updateSortState();
        return;
      }

      activeSort = nextValue;
      runGridUpdate();
    };

    if (sortSelect) {
      sortSelect.addEventListener('change', (event) => {
        applySortValue(event.target.value);
      });
    }

    if (sortMenu && sortTrigger && sortList && sortOptions.length) {
      sortTrigger.addEventListener('click', () => {
        if (sortMenu.classList.contains('is-open')) {
          closeSortMenu();
          return;
        }

        openSortMenu();
      });

      sortOptions.forEach((button, index) => {
        button.addEventListener('click', () => {
          applySortValue(button.dataset.sortOption);
          closeSortMenu();
          sortTrigger.focus();
        });

        button.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const nextIndex = (index + direction + sortOptions.length) % sortOptions.length;
            sortOptions[nextIndex].focus();
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            closeSortMenu();
            sortTrigger.focus();
          }
        });
      });

      sortTrigger.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeSortMenu();
          return;
        }

        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
          return;
        }

        event.preventDefault();
        openSortMenu();
        const activeOption = sortOptions.find((button) => button.dataset.sortOption === activeSort) || sortOptions[0];
        activeOption.focus();
      });

      document.addEventListener('click', (event) => {
        if (sortMenu.classList.contains('is-open') && !sortMenu.contains(event.target)) {
          closeSortMenu();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sortMenu.classList.contains('is-open')) {
          closeSortMenu();
          if (sortMenu.contains(document.activeElement)) {
            sortTrigger.focus();
          }
        }
      });
    }

    projectCards.forEach((card) => {
      const isCtaCard = card.hasAttribute('data-project-cta');
      if (isCtaCard) {
        card.removeAttribute('tabindex');
        card.removeAttribute('aria-haspopup');
        card.removeAttribute('aria-controls');
        return;
      }

      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-controls', 'project-modal');

      card.addEventListener('click', (event) => {
        if (shouldIgnoreCardOpen(event.target)) {
          return;
        }

        openProjectModal(card);
      });

      card.addEventListener('keydown', (event) => {
        if ((event.key !== 'Enter' && event.key !== ' ') || shouldIgnoreCardOpen(event.target)) {
          return;
        }

        event.preventDefault();
        if (typeof openProjectModal === 'function') {
          openProjectModal(card);
        }
      });
    });

    applyGridState();
  };

  const setupProjectFocusMode = () => {
    const projectGrids = Array.from(document.querySelectorAll('.projects-grid'));
    if (!projectGrids.length) {
      return;
    }

    const coarsePointerQuery = window.matchMedia('(hover: none), (pointer: coarse)');

    projectGrids.forEach((grid) => {
      const cards = Array.from(grid.querySelectorAll('.project-card:not([data-project-modal-card])'));
      if (cards.length < 2) {
        return;
      }

      grid.classList.add('project-focus-mode');
      let activeCard = null;

      const applyFocusState = (nextCard = null) => {
        const visibleCards = cards.filter((card) => !card.hidden);
        activeCard = nextCard && visibleCards.includes(nextCard) ? nextCard : null;
        const hasActiveCard = Boolean(activeCard);
        const hasMultiVisible = visibleCards.length > 1;
        grid.classList.toggle('is-focus-active', hasActiveCard && hasMultiVisible);

        cards.forEach((card) => {
          const isActive = hasActiveCard && card === activeCard;
          const isMuted = hasActiveCard && hasMultiVisible && !isActive && !card.hidden;
          card.classList.toggle('is-active', isActive);
          card.classList.toggle('is-muted', isMuted);
        });
      };

      const clearFocusState = () => {
        applyFocusState(null);
      };

      cards.forEach((card) => {
        card.addEventListener(
          'pointerenter',
          () => {
            if (coarsePointerQuery.matches) {
              return;
            }
            applyFocusState(card);
          },
          { passive: true }
        );

        card.addEventListener(
          'pointerdown',
          (event) => {
            if (!event.isPrimary || !coarsePointerQuery.matches) {
              return;
            }
            applyFocusState(card);
          },
          { passive: true }
        );

        card.addEventListener('focusin', () => {
          applyFocusState(card);
        });

        card.addEventListener(
          'pointerleave',
          (event) => {
            if (coarsePointerQuery.matches) {
              return;
            }

            const nextCard =
              event.relatedTarget &&
              typeof event.relatedTarget.closest === 'function' &&
              event.relatedTarget.closest('.project-card:not([data-project-modal-card])');
            if (nextCard && cards.includes(nextCard) && !nextCard.hidden) {
              applyFocusState(nextCard);
              return;
            }

            clearFocusState();
          },
          { passive: true }
        );
      });

      grid.addEventListener(
        'pointerleave',
        () => {
          if (coarsePointerQuery.matches) {
            return;
          }
          clearFocusState();
        },
        { passive: true }
      );

      grid.addEventListener('focusout', () => {
        window.requestAnimationFrame(() => {
          if (!grid.contains(document.activeElement)) {
            clearFocusState();
          }
        });
      });

      document.addEventListener(
        'pointerdown',
        (event) => {
          if (!coarsePointerQuery.matches || grid.contains(event.target)) {
            return;
          }
          clearFocusState();
        },
        { passive: true }
      );

      const observer = new MutationObserver(() => {
        if (activeCard && activeCard.hidden) {
          clearFocusState();
        }
      });
      observer.observe(grid, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
      clearFocusState();
    });
  };

  setupProjectShowcase();
  setupProjectFocusMode();
  ensureAmbientBackground();
  const scheduleAmbientParticles = () => {
    if (ambientMode === 'off') {
      return;
    }

    let started = false;
    const start = () => {
      if (started) {
        return;
      }
      started = true;
      setupAmbientParticles();
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: 1400 });
      return;
    }

    window.setTimeout(start, 900);
  };

  if (document.readyState === 'complete') {
    scheduleAmbientParticles();
  } else {
    window.addEventListener('load', scheduleAmbientParticles, { once: true });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const canRunPointerEffects = !reducedMotion && finePointer && pointerEffectsEnabled;
  const customCursorActive = canRunPointerEffects && customCursorEnabled && !perfLite;
  if (canRunPointerEffects) {
    const lerp = (current, target, amount) => current + (target - current) * amount;
    let cursorRing = null;
    let cursorDot = null;
    if (customCursorActive) {
      const cursorLayer = document.createElement('div');
      cursorLayer.className = 'custom-cursor-layer';
      cursorLayer.setAttribute('aria-hidden', 'true');
      cursorRing = document.createElement('span');
      cursorRing.className = 'custom-cursor-ring';
      cursorDot = document.createElement('span');
      cursorDot.className = 'custom-cursor-dot';
      cursorLayer.append(cursorRing, cursorDot);
      document.body.appendChild(cursorLayer);
      root.classList.add('custom-cursor-active');
    }
    const interactiveCursorSelector =
      'a, button, [role="button"], input, textarea, select, label, [data-project-card]';
    const textCursorSelector =
      'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), textarea';
    let cursorFrame = 0;
    let cursorRingX = window.innerWidth * 0.5;
    let cursorRingY = window.innerHeight * 0.5;
    let cursorTargetX = cursorRingX;
    let cursorTargetY = cursorRingY;

    const setCursorTargetType = (target) => {
      if (!customCursorActive) {
        return;
      }
      const interactive = Boolean(target && target.closest(interactiveCursorSelector));
      const textTarget = Boolean(target && target.closest(textCursorSelector));
      root.classList.toggle('cursor-hovering', interactive && !textTarget);
      root.classList.toggle('cursor-text-target', textTarget);
    };

    const syncCustomCursor = () => {
      if (!customCursorActive || !cursorRing) {
        return;
      }
      cursorFrame = 0;
      const ringDeltaX = cursorTargetX - cursorRingX;
      const ringDeltaY = cursorTargetY - cursorRingY;
      const ringDistanceSquared = ringDeltaX * ringDeltaX + ringDeltaY * ringDeltaY;
      const ringAmount = ringDistanceSquared > 19600 ? 0.84 : ringDistanceSquared > 3025 ? 0.74 : 0.62;

      cursorRingX = lerp(cursorRingX, cursorTargetX, ringAmount);
      cursorRingY = lerp(cursorRingY, cursorTargetY, ringAmount);

      cursorRing.style.left = `${cursorRingX.toFixed(2)}px`;
      cursorRing.style.top = `${cursorRingY.toFixed(2)}px`;

      if (Math.abs(cursorRingX - cursorTargetX) > 0.08 || Math.abs(cursorRingY - cursorTargetY) > 0.08) {
        cursorFrame = window.requestAnimationFrame(syncCustomCursor);
      }
    };

    const queueCustomCursor = () => {
      if (!cursorFrame) {
        cursorFrame = window.requestAnimationFrame(syncCustomCursor);
      }
    };

    root.classList.add('has-pointer-effects');
    root.style.setProperty('--cursor-x', '50%');
    root.style.setProperty('--cursor-y', '50%');
    root.style.setProperty('--particle-shift-x', '0px');
    root.style.setProperty('--particle-shift-y', '0px');
    root.style.setProperty('--particle-shift-soft-x', '0px');
    root.style.setProperty('--particle-shift-soft-y', '0px');
    const enableParticleParallax = ambientMode !== 'off' && !root.classList.contains('ambient-canvas-ready');
    const particleRangeX = ambientMode === 'lite' ? 28 : 42;
    const particleRangeY = ambientMode === 'lite' ? 22 : 34;

    let glowFrame = 0;
    let glowCurrentX = 50;
    let glowCurrentY = 50;
    let glowTargetX = 50;
    let glowTargetY = 50;
    let particleFrame = 0;
    let particleCurrentX = 0;
    let particleCurrentY = 0;
    let particleCurrentSoftX = 0;
    let particleCurrentSoftY = 0;
    let particleTargetX = 0;
    let particleTargetY = 0;
    let particleTargetSoftX = 0;
    let particleTargetSoftY = 0;
    const syncCursorGlow = () => {
      glowFrame = 0;
      glowCurrentX = lerp(glowCurrentX, glowTargetX, 0.2);
      glowCurrentY = lerp(glowCurrentY, glowTargetY, 0.2);

      root.style.setProperty('--cursor-x', `${glowCurrentX.toFixed(2)}%`);
      root.style.setProperty('--cursor-y', `${glowCurrentY.toFixed(2)}%`);

      if (Math.abs(glowCurrentX - glowTargetX) > 0.02 || Math.abs(glowCurrentY - glowTargetY) > 0.02) {
        glowFrame = window.requestAnimationFrame(syncCursorGlow);
      }
    };

    const queueCursorGlow = () => {
      if (!glowFrame) {
        glowFrame = window.requestAnimationFrame(syncCursorGlow);
      }
    };

    const syncParticleShift = () => {
      particleFrame = 0;
      particleCurrentX = lerp(particleCurrentX, particleTargetX, 0.22);
      particleCurrentY = lerp(particleCurrentY, particleTargetY, 0.22);
      particleCurrentSoftX = lerp(particleCurrentSoftX, particleTargetSoftX, 0.24);
      particleCurrentSoftY = lerp(particleCurrentSoftY, particleTargetSoftY, 0.24);

      root.style.setProperty('--particle-shift-x', `${particleCurrentX.toFixed(2)}px`);
      root.style.setProperty('--particle-shift-y', `${particleCurrentY.toFixed(2)}px`);
      root.style.setProperty('--particle-shift-soft-x', `${particleCurrentSoftX.toFixed(2)}px`);
      root.style.setProperty('--particle-shift-soft-y', `${particleCurrentSoftY.toFixed(2)}px`);

      const moving =
        Math.abs(particleCurrentX - particleTargetX) > 0.05 ||
        Math.abs(particleCurrentY - particleTargetY) > 0.05 ||
        Math.abs(particleCurrentSoftX - particleTargetSoftX) > 0.05 ||
        Math.abs(particleCurrentSoftY - particleTargetSoftY) > 0.05;

      if (moving) {
        particleFrame = window.requestAnimationFrame(syncParticleShift);
      }
    };

    const queueParticleShift = () => {
      if (!particleFrame) {
        particleFrame = window.requestAnimationFrame(syncParticleShift);
      }
    };

    window.addEventListener(
      'pointermove',
      (event) => {
        if (root.classList.contains('theme-transition-running')) {
          return;
        }

        if (customCursorActive && cursorRing && cursorDot) {
          cursorTargetX = event.clientX;
          cursorTargetY = event.clientY;

          if (!root.classList.contains('cursor-visible')) {
            cursorRingX = event.clientX;
            cursorRingY = event.clientY;
            cursorRing.style.left = `${cursorRingX.toFixed(2)}px`;
            cursorRing.style.top = `${cursorRingY.toFixed(2)}px`;
          }
          cursorDot.style.left = `${event.clientX.toFixed(2)}px`;
          cursorDot.style.top = `${event.clientY.toFixed(2)}px`;

          root.classList.add('cursor-visible');
          setCursorTargetType(event.target);
          queueCustomCursor();
        }

        const viewportW = window.innerWidth || 1;
        const viewportH = window.innerHeight || 1;
        glowTargetX = (event.clientX / viewportW) * 100;
        glowTargetY = (event.clientY / viewportH) * 100;
        if (enableParticleParallax) {
          particleTargetX = (event.clientX / viewportW - 0.5) * particleRangeX;
          particleTargetY = (event.clientY / viewportH - 0.5) * particleRangeY;
          particleTargetSoftX = particleTargetX * 0.56;
          particleTargetSoftY = particleTargetY * 0.56;
          queueParticleShift();
        }
        queueCursorGlow();
      },
      { passive: true }
    );

    window.addEventListener(
      'pointerdown',
      (event) => {
        if (!customCursorActive || !event.isPrimary) {
          return;
        }
        root.classList.add('cursor-pressed');
        setCursorTargetType(event.target);
      },
      { passive: true }
    );

    window.addEventListener(
      'pointerup',
      () => {
        if (!customCursorActive) {
          return;
        }
        root.classList.remove('cursor-pressed');
      },
      { passive: true }
    );

    window.addEventListener(
      'pointercancel',
      () => {
        if (!customCursorActive) {
          return;
        }
        root.classList.remove('cursor-pressed');
      },
      { passive: true }
    );

    window.addEventListener('pointerleave', () => {
      if (customCursorActive) {
        root.classList.remove('cursor-visible', 'cursor-hovering', 'cursor-pressed', 'cursor-text-target');
      }
      if (!enableParticleParallax) {
        return;
      }

      particleTargetX = 0;
      particleTargetY = 0;
      particleTargetSoftX = 0;
      particleTargetSoftY = 0;
      queueParticleShift();
    });

    window.addEventListener('blur', () => {
      if (customCursorActive) {
        root.classList.remove('cursor-visible', 'cursor-hovering', 'cursor-pressed', 'cursor-text-target');
      }
    });

    const interactiveCards = document.querySelectorAll(
      '.hero-copy, .page-hero-card, .surface-card, .project-card:not([data-project-modal-card]), .contact-card, .process-card, .info-card, .timeline-card, .quote-card, .form-shell'
    );

    interactiveCards.forEach((card) => {
      const state = {
        frame: 0,
        currentTiltX: 0,
        currentTiltY: 0,
        targetTiltX: 0,
        targetTiltY: 0,
        currentPointerX: 50,
        currentPointerY: 50,
        targetPointerX: 50,
        targetPointerY: 50,
      };

      const renderCard = () => {
        state.frame = 0;
        state.currentTiltX = lerp(state.currentTiltX, state.targetTiltX, 0.3);
        state.currentTiltY = lerp(state.currentTiltY, state.targetTiltY, 0.3);
        state.currentPointerX = lerp(state.currentPointerX, state.targetPointerX, 0.32);
        state.currentPointerY = lerp(state.currentPointerY, state.targetPointerY, 0.32);

        card.style.setProperty('--tilt-x', `${state.currentTiltX.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${state.currentTiltY.toFixed(2)}deg`);
        card.style.setProperty('--pointer-x', `${state.currentPointerX.toFixed(1)}%`);
        card.style.setProperty('--pointer-y', `${state.currentPointerY.toFixed(1)}%`);

        const moving =
          Math.abs(state.currentTiltX - state.targetTiltX) > 0.02 ||
          Math.abs(state.currentTiltY - state.targetTiltY) > 0.02 ||
          Math.abs(state.currentPointerX - state.targetPointerX) > 0.05 ||
          Math.abs(state.currentPointerY - state.targetPointerY) > 0.05;

        if (moving) {
          state.frame = window.requestAnimationFrame(renderCard);
        }
      };

      const queueCardRender = () => {
        if (!state.frame) {
          state.frame = window.requestAnimationFrame(renderCard);
        }
      };

      const resetCardTilt = ({ resetPointer = false } = {}) => {
        state.targetTiltX = 0;
        state.targetTiltY = 0;
        if (resetPointer) {
          state.targetPointerX = 50;
          state.targetPointerY = 50;
        }
        queueCardRender();
      };

      resetCardTilt({ resetPointer: true });

      card.addEventListener(
        'pointermove',
        (event) => {
          if (root.classList.contains('theme-transition-running')) {
            return;
          }

          const rect = card.getBoundingClientRect();
          if (!rect.width || !rect.height) {
            return;
          }

          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          const clampedX = Math.min(Math.max(px, 0), 1);
          const clampedY = Math.min(Math.max(py, 0), 1);
          state.targetTiltX = (0.5 - clampedY) * 5.4;
          state.targetTiltY = (clampedX - 0.5) * 6.3;
          state.targetPointerX = clampedX * 100;
          state.targetPointerY = clampedY * 100;
          queueCardRender();
        },
        { passive: true }
      );

      card.addEventListener('pointerleave', resetCardTilt);
      card.addEventListener('pointercancel', resetCardTilt);
    });
  }

  const form = document.querySelector('[data-demo-form]');
  const formNote = document.querySelector('[data-form-response]');
  if (form && formNote) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const message = String(formData.get('message') || '').trim();

      if (!name || !email || !message) {
        formNote.textContent = 'Please complete all fields before sending.';
        return;
      }

      const contactEmail = (window.siteConfig && window.siteConfig.email) || 'hello@example.com';
      const subject = encodeURIComponent(`Project inquiry from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);

      formNote.textContent = 'Opening your email client...';
      window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    });
  }

  applyConfig();
  updateThemeLabel();
})();

