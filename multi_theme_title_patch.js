/*
 * PuzzleSheet enhancement patch
 * Adds:
 *  1. Multiple Lichess themes in one fetch.
 *  2. An independent puzzle count for each selected theme.
 *  3. An editable title on every generated worksheet page.
 *
 * HOW TO INSTALL:
 * Paste this entire file's contents into a new <script> block AFTER your
 * existing main <script> block and BEFORE </body>.
 */
(function () {
  if (window.__puzzleSheetMultiThemePatchLoaded) return;
  window.__puzzleSheetMultiThemePatchLoaded = true;

  const $ = (id) => document.getElementById(id);
  const themeSelect = $('lc-theme');
  const oldTotalField = $('cnt-total');
  const fetchButton = $('fetch-btn');

  if (!themeSelect || !oldTotalField || !fetchButton) {
    console.error('PuzzleSheet patch: required original controls were not found.');
    return;
  }

  const themeConfigs = [];
  let sheetTitles = [];
  let customSheetTitles = [];
  let fetchedThemeNames = [];
  let fetchedThemeFens = [];

  // ---------- Styling ----------
  const style = document.createElement('style');
  style.textContent = `
    .multi-theme-panel {
      display:flex; flex-direction:column; gap:9px;
      padding:10px; background:var(--surface2);
      border:1px solid var(--border-light); border-radius:8px;
    }
    .multi-theme-add-row { display:flex; align-items:end; gap:7px; }
    .multi-theme-add-row .s-field { flex:1; min-width:0; }
    .multi-theme-add-row .btn { white-space:nowrap; min-height:34px; }
    .multi-theme-list { display:flex; flex-direction:column; gap:7px; }
    .multi-theme-item {
      display:grid; grid-template-columns:minmax(0,1fr) 66px 28px;
      align-items:center; gap:7px; padding:7px;
      border:1px solid var(--border-light); border-radius:7px;
      background:rgba(0,0,0,.12);
    }
    .multi-theme-name {
      min-width:0; font-size:11px; line-height:1.35;
      color:var(--text-dim); overflow-wrap:anywhere;
    }
    .multi-theme-count {
      width:66px; min-width:0; padding:6px 5px;
      background:var(--surface); border:1px solid var(--border-light);
      border-radius:6px; color:var(--text); font:12px 'DM Sans',sans-serif;
      text-align:center; outline:none;
    }
    .multi-theme-count:focus { border-color:var(--gold-dim); }
    .multi-theme-remove {
      width:27px; height:27px; padding:0; border:1px solid rgba(192,57,43,.35);
      border-radius:6px; background:transparent; color:#e57373; cursor:pointer;
      font-size:16px; line-height:1;
    }
    .multi-theme-remove:hover { background:rgba(192,57,43,.12); }
    .multi-theme-summary { font-size:10px; color:var(--gold); text-align:right; line-height:1.5; }
    .multi-theme-help { font-size:9.5px; color:var(--text-muted); line-height:1.5; }
    .hdr-sheet-title {
      min-height:24px; margin:0 0 4px; padding:1px 3px;
      border-radius:3px; outline:none; cursor:text;
      color:#1a1a1a; font-family:'Playfair Display',serif;
      font-size:19px; font-weight:700; line-height:1.2;
      overflow-wrap:anywhere;
    }
    .hdr-sheet-title:focus {
      background:#fff8e8; outline:1px dashed #b28b3b;
    }
    .hdr-title {
      font-size:10px !important; font-weight:700 !important;
      color:#8a6c2a !important; margin-bottom:3px !important;
    }
    @media print {
      .hdr-sheet-title {
        min-height:0; margin:0 0 2px; padding:0;
        color:#111 !important; font-size:15px !important;
        outline:none !important; background:transparent !important;
      }
      .hdr-title { font-size:9px !important; color:#555 !important; }
    }
    @media (max-width:520px) {
      .multi-theme-add-row { align-items:stretch; flex-direction:column; }
      .multi-theme-add-row .btn { width:100%; }
    }
  `;
  document.head.appendChild(style);

  // ---------- Replace the single total-count control with theme quantities ----------
  const oldTotalContainer = oldTotalField.closest('.s-field');
  if (oldTotalContainer) oldTotalContainer.style.display = 'none';

  const panel = document.createElement('div');
  panel.className = 'multi-theme-panel';
  panel.innerHTML = `
    <div>
      <div class="s-label" style="margin-bottom:6px">Selected themes and puzzle counts</div>
      <div class="multi-theme-help">Add each theme you want. Set how many puzzles to fetch for that theme. Up to 60 puzzles per theme.</div>
    </div>
    <div class="multi-theme-add-row">
      <div class="s-field">
        <div class="s-label">Count for next theme</div>
        <input class="s-input" id="multi-theme-new-count" type="number" min="1" max="60" value="6" />
      </div>
      <button class="btn btn-outline" id="multi-theme-add" type="button">＋ Add theme</button>
    </div>
    <div class="multi-theme-list" id="multi-theme-list"></div>
    <div class="multi-theme-summary" id="multi-theme-summary">0 puzzles → 0 sheets</div>
  `;
  const themeField = themeSelect.closest('.s-field');
  themeField.insertAdjacentElement('afterend', panel);

  const themeList = $('multi-theme-list');
  const summary = $('multi-theme-summary');
  const newCountInput = $('multi-theme-new-count');

  function safeCount(value) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(60, n));
  }

  function updateThemeSummary() {
    const total = themeConfigs.reduce((sum, item) => sum + item.count, 0);
    const sheets = Math.ceil(total / 6);
    summary.textContent = `${total} puzzle${total === 1 ? '' : 's'} → ${sheets} sheet${sheets === 1 ? '' : 's'}`;
    oldTotalField.value = String(total);
    if (typeof updateSheetEstimate === 'function') updateSheetEstimate();
  }

  function renderThemeList() {
    themeList.innerHTML = '';

    themeConfigs.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'multi-theme-item';

      const name = document.createElement('div');
      name.className = 'multi-theme-name';
      name.textContent = item.label;
      name.title = item.label;

      const count = document.createElement('input');
      count.className = 'multi-theme-count';
      count.type = 'number';
      count.min = '1';
      count.max = '60';
      count.step = '1';
      count.value = String(item.count);
      count.setAttribute('aria-label', `Puzzle count for ${item.label}`);
      count.addEventListener('change', () => {
        item.count = safeCount(count.value);
        count.value = String(item.count);
        updateThemeSummary();
      });
      count.addEventListener('input', () => {
        const n = Number.parseInt(count.value, 10);
        if (Number.isFinite(n) && n >= 1 && n <= 60) {
          item.count = n;
          updateThemeSummary();
        }
      });

      const remove = document.createElement('button');
      remove.className = 'multi-theme-remove';
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = `Remove ${item.label}`;
      remove.setAttribute('aria-label', `Remove ${item.label}`);
      remove.addEventListener('click', () => {
        themeConfigs.splice(index, 1);
        renderThemeList();
      });

      row.append(name, count, remove);
      themeList.appendChild(row);
    });

    updateThemeSummary();
  }

  function addSelectedTheme(countValue) {
    const option = themeSelect.options[themeSelect.selectedIndex];
    if (!option || !option.value) return;

    const existing = themeConfigs.find((item) => item.theme === option.value);
    if (existing) {
      const rows = themeList.querySelectorAll('.multi-theme-item');
      const input = rows[themeConfigs.indexOf(existing)]?.querySelector('input');
      if (input) {
        input.focus();
        input.select();
      }
      alert('That theme is already in your list. Change its puzzle count instead.');
      return;
    }

    themeConfigs.push({
      theme: option.value,
      label: option.textContent.trim(),
      count: safeCount(countValue)
    });
    renderThemeList();
  }

  $('multi-theme-add').addEventListener('click', () => addSelectedTheme(newCountInput.value));
  newCountInput.addEventListener('change', () => {
    newCountInput.value = String(safeCount(newCountInput.value));
  });

  // Start with the theme already selected in the original dropdown.
  addSelectedTheme(oldTotalField.value || 12);

  // ---------- Per-sheet editable titles ----------
  const academyTitle = $('ws-title');
  const titleField = document.createElement('div');
  titleField.className = 's-field';
  titleField.innerHTML = `
    <div class="s-label">Default worksheet title</div>
    <input type="text" class="s-input" id="default-sheet-title" value="Chess Puzzle Worksheet" />
    <div class="s-label" style="margin-top:8px">Sheet title mode</div>
    <select class="s-input" id="sheet-title-mode">
      <option value="manual" selected>Manual title</option>
      <option value="theme">Automatically use puzzle theme</option>
    </select>
    <div style="font-size:9.5px;color:var(--text-muted);margin-top:4px">Theme mode names each sheet after the Lichess theme(s) represented on it. You can still click any preview title to edit it.</div>
  `;
  academyTitle.closest('.s-field').insertAdjacentElement('afterend', titleField);

  function makeDefaultSheetTitle(index) {
    const base = ($('default-sheet-title').value || 'Chess Puzzle Worksheet').trim();
    return `${base} — Sheet ${index + 1}`;
  }

  function getAutoThemeTitle(page) {
    if ($('sheet-title-mode').value !== 'theme') return '';

    // Only use theme names when this exact puzzle list came from the latest
    // multi-theme Lichess fetch. This prevents stale titles on Manual/Built-in sets.
    const currentFens = typeof allPuzzles !== 'undefined' && Array.isArray(allPuzzles)
      ? allPuzzles : [];
    if (!fetchedThemeFens.length ||
        currentFens.length !== fetchedThemeFens.length ||
        !currentFens.every((fen, index) => fen === fetchedThemeFens[index])) {
      return '';
    }

    const labels = [];
    page.querySelectorAll('.puzzle-num-lbl').forEach((label) => {
      const match = label.textContent.match(/Puzzle\s+(\d+)/i);
      if (!match) return;
      const puzzleIndex = Number(match[1]) - 1;
      const themeName = fetchedThemeNames[puzzleIndex];
      if (themeName && !labels.includes(themeName)) labels.push(themeName);
    });

    if (!labels.length) return '';
    if (labels.length <= 3) return labels.join(' + ');
    return `${labels.slice(0, 2).join(' + ')} + ${labels.length - 2} more themes`;
  }

  function getSheetTitle(page, index) {
    return getAutoThemeTitle(page) || makeDefaultSheetTitle(index);
  }

  function decorateSheetTitles() {
    document.querySelectorAll('.worksheet-page').forEach((page, index) => {
      const headerCenter = page.querySelector('.hdr-center');
      if (!headerCenter) return;

      let title = headerCenter.querySelector('.hdr-sheet-title');
      if (!title) {
        title = document.createElement('div');
        title.className = 'hdr-sheet-title';
        title.contentEditable = 'true';
        title.spellcheck = false;
        title.setAttribute('role', 'textbox');
        title.setAttribute('aria-label', `Title for sheet ${index + 1}`);
        title.setAttribute('title', 'Click here to edit this sheet title');
        headerCenter.insertBefore(title, headerCenter.firstChild);

        title.addEventListener('input', () => {
          sheetTitles[index] = title.textContent.trim();
          customSheetTitles[index] = true;
        });
        title.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            title.blur();
          }
        });
      }

      if (typeof sheetTitles[index] !== 'string' || !sheetTitles[index]) {
        sheetTitles[index] = getSheetTitle(page, index);
      }
      title.textContent = sheetTitles[index];
    });
  }

  $('default-sheet-title').addEventListener('input', () => {
    document.querySelectorAll('.worksheet-page').forEach((page, index) => {
      if (customSheetTitles[index]) return;
      sheetTitles[index] = getSheetTitle(page, index);
      const title = page.querySelector('.hdr-sheet-title');
      if (title) title.textContent = sheetTitles[index];
    });
  });

  // Switching title modes clears per-sheet overrides so the selected mode
  // immediately takes effect on every worksheet.
  $('sheet-title-mode').addEventListener('change', () => {
    document.querySelectorAll('.worksheet-page').forEach((page, index) => {
      customSheetTitles[index] = false;
      sheetTitles[index] = getSheetTitle(page, index);
      const title = page.querySelector('.hdr-sheet-title');
      if (title) title.textContent = sheetTitles[index];
    });
  });

  // Wrap the original renderer so Built-in, Manual, and Lichess pages all get titles.
  const originalBuildUI = window.buildUI;
  if (typeof originalBuildUI === 'function') {
    window.buildUI = function () {
      const result = originalBuildUI.apply(this, arguments);
      decorateSheetTitles();
      return result;
    };
  } else {
    console.error('PuzzleSheet patch: original buildUI function was not found.');
  }

  // Clear custom titles when the user clears the worksheet set.
  $('clear-btn').addEventListener('click', () => {
    sheetTitles = [];
    customSheetTitles = [];
    fetchedThemeNames = [];
    fetchedThemeFens = [];
    window.__puzzleSheetThemeNames = [];
    window.__puzzleSheetThemeFens = [];
  });

  // ---------- Multi-theme Lichess fetch ----------
  window.fetchFromLichess = async function () {
    if (typeof IS_FILE_PROTOCOL !== 'undefined' && IS_FILE_PROTOCOL) {
      alert('Cannot fetch from Lichess when opening from file://.\n\nUse Built-in, Manual, or serve this file with:\npython -m http.server\nthen open http://localhost:8000');
      return;
    }

    const configs = themeConfigs.filter((item) => item.count > 0);
    if (!configs.length) {
      alert('Add at least one theme before fetching puzzles.');
      return;
    }

    const apiKey = typeof getApiKey === 'function' ? getApiKey() : '';
    const difficulty = $('lc-difficulty').value;
    const totalRequested = configs.reduce((sum, item) => sum + item.count, 0);
    const progress = $('fetch-progress');
    const bar = $('fetch-bar');
    const msg = $('fetch-msg');

    fetchButton.disabled = true;
    fetchButton.textContent = '⏳ Fetching themes…';
    progress.style.display = 'block';
    bar.style.width = '0%';

    const combinedFens = [];
    const combinedThemeNames = [];
    const seen = new Set();
    let completed = 0;

    try {
      for (let themeIndex = 0; themeIndex < configs.length; themeIndex++) {
        const config = configs[themeIndex];
        msg.textContent = `Fetching ${config.count} ${config.label} puzzles (${themeIndex + 1}/${configs.length})…`;
        bar.style.width = `${Math.round((themeIndex / configs.length) * 100)}%`;

        let themeFens = await fetchBatch(config.theme, config.count, apiKey, difficulty);
        const uniqueForTheme = [];
        for (const fen of themeFens) {
          if (fen && !seen.has(fen) && uniqueForTheme.length < config.count) {
            seen.add(fen);
            uniqueForTheme.push(fen);
          }
        }

        // The batch endpoint can return fewer positions than requested.
        // Top up this theme individually while avoiding duplicate FENs.
        let attempts = 0;
        const maxAttempts = config.count * 3 + 20;
        while (uniqueForTheme.length < config.count && attempts < maxAttempts) {
          attempts++;
          const fen = await fetchOnePuzzle(config.theme, apiKey, difficulty);
          if (fen && !seen.has(fen)) {
            seen.add(fen);
            uniqueForTheme.push(fen);
          }
        }

        combinedFens.push(...uniqueForTheme);
        combinedThemeNames.push(...uniqueForTheme.map(() => config.label));
        completed += uniqueForTheme.length;
        bar.style.width = `${Math.round(((themeIndex + 1) / configs.length) * 100)}%`;
        msg.textContent = `${config.label}: ${uniqueForTheme.length}/${config.count} fetched. Total ${completed}/${totalRequested}.`;
      }

      if (!combinedFens.length) {
        throw new Error('No puzzles were returned. Try different themes or check your Lichess token.');
      }

      allPuzzles = combinedFens;
      allDiffs = combinedFens.map(() => '');
      fetchedThemeNames = combinedThemeNames.slice();
      fetchedThemeFens = combinedFens.slice();
      window.__puzzleSheetThemeNames = fetchedThemeNames.slice();
      window.__puzzleSheetThemeFens = fetchedThemeFens.slice();
      sheetTitles = [];
      customSheetTitles = [];
      $('fen-ta').value = combinedFens.join('\n');
      if (typeof updateCount === 'function') updateCount();
      if (typeof doGenerate === 'function') doGenerate();

      msg.textContent = `✓ Fetched ${combinedFens.length} of ${totalRequested} requested puzzles across ${configs.length} theme${configs.length === 1 ? '' : 's'}.`;
      bar.style.width = '100%';
      window.setTimeout(() => { progress.style.display = 'none'; }, 4500);
    } catch (error) {
      bar.style.width = '0%';
      const isCors = typeof isCORSError === 'function' && isCORSError(error);
      msg.textContent = isCors
        ? '✗ CORS/network blocked. Try localhost instead of file://.'
        : `✗ ${error.message || 'Fetch failed.'}`;
      window.setTimeout(() => { progress.style.display = 'none'; }, 8000);
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = '⬇ Fetch selected themes';
    }
  };

  fetchButton.textContent = '⬇ Fetch selected themes';
  updateThemeSummary();
})();
