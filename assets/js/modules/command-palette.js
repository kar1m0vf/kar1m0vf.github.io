export const setupCommandPalette = ({
  siteConfig = window.siteConfig || {},
  toggleTheme = () => {},
  reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)'),
} = {}) => {
  if (!document.body) {
    return null;
  }

  const existingPalette = document.querySelector('[data-command-palette-root]');
  if (existingPalette && existingPalette.commandPaletteApi) {
    return existingPalette.commandPaletteApi;
  }

  const palette = document.createElement('div');
  palette.className = 'command-palette';
  palette.hidden = true;
  palette.setAttribute('aria-hidden', 'true');
  palette.setAttribute('data-command-palette-root', '');
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
    return null;
  }

  const isMac = /Mac|iPhone|iPad|iPod/i.test(window.navigator.platform || '');
  if (hotkeyNode) {
    hotkeyNode.textContent = isMac ? 'Cmd K' : 'Ctrl K';
  }
  document.querySelectorAll('[data-command-shortcut]').forEach((node) => {
    node.textContent = isMac ? 'Cmd+K' : 'Ctrl+K';
  });

  const emailHref = String(
    siteConfig.emailHref || (siteConfig.email ? `mailto:${siteConfig.email}` : 'mailto:hello@example.com')
  );
  const githubHref = String(siteConfig.githubHref || '');
  const telegramHref = String(siteConfig.telegramHref || '');

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
      label: 'Send Email',
      meta: 'Contact',
      hint: siteConfig.email || 'mailto',
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
      hint: siteConfig.github || 'GitHub',
      search: 'github code repository profile',
      run: () => openExternal(githubHref),
    });
  }

  if (telegramHref) {
    commands.push({
      label: 'Open Telegram',
      meta: 'Social',
      hint: siteConfig.telegram || 'Telegram',
      search: 'telegram chat message',
      run: () => openExternal(telegramHref),
    });
  }

  const scrollToId = (id) => {
    const target = document.getElementById(id);
    if (!target) {
      return false;
    }

    target.scrollIntoView({
      behavior: reduceMotionQuery.matches ? 'auto' : 'smooth',
      block: 'start',
    });
    return true;
  };

  const homepageAnchors = [
    { id: 'home', label: 'Jump to Hero', search: 'hero homepage intro landing' },
    { id: 'flagship', label: 'Jump to Flagship', search: 'flagship case study trendyol tracker' },
    { id: 'quality-evidence', label: 'Jump to CI Evidence', search: 'ci evidence quality tests lighthouse' },
    { id: 'selected-projects', label: 'Jump to Selected Projects', search: 'selected projects showcases modules' },
    { id: 'capabilities', label: 'Jump to Capabilities', search: 'capabilities strip stack skills' },
    { id: 'contact-cta', label: 'Jump to Contact CTA', search: 'contact cta hire collaboration' },
  ];

  homepageAnchors.forEach((entry) => {
    if (!document.getElementById(entry.id)) {
      return;
    }

    commands.push({
      label: entry.label,
      meta: 'Homepage',
      hint: `#${entry.id}`,
      search: entry.search,
      run: () => {
        scrollToId(entry.id);
      },
    });
  });

  const flagshipTabs = Array.from(document.querySelectorAll('[data-flagship-tab]'));
  flagshipTabs.forEach((tab) => {
    const tabKey = String(tab.getAttribute('data-flagship-tab') || '').trim();
    const tabLabel = String(tab.textContent || '').trim();
    if (!tabKey || !tabLabel) {
      return;
    }

    commands.push({
      label: `Flagship: ${tabLabel}`,
      meta: 'Homepage',
      hint: tabLabel,
      search: `flagship ${tabKey} ${tabLabel.toLowerCase()} trendyol`,
      run: () => {
        scrollToId('flagship');
        tab.click();
      },
    });
  });

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

  document.querySelectorAll('[data-command-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      if (open) {
        closePalette({ restoreFocus: false });
        return;
      }
      openPalette();
    });
  });

  const api = { openPalette, closePalette };
  palette.commandPaletteApi = api;
  return api;
};
