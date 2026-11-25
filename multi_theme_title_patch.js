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
  let sheetSubtitles = [];
  let customSheetSubtitles = [];
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
    .hdr-sub[contenteditable="true"] { cursor:text; border-radius:3px; padding:1px 3px; }
    .hdr-sub[contenteditable="true"]:focus { outline:1px dashed #b28b3b; background:#fff8e8; }
    @media print {
      .hdr-sheet-title {
        min-height:0; margin:0 0 2px; padding:0;
        color:#111 !important; font-size:15px !important;
        outline:none !important; background:transparent !important;
      }
      .hdr-title { font-size:9px !important; color:#555 !important; }
    }
    /* Print repair: let every worksheet page flow naturally instead of
       clipping it to a fixed 281mm box. Repaint boards before printing. */
    @media print {
      @page { size:A4 portrait; margin:8mm; }
      html, body { width:auto !important; height:auto !important; min-height:0 !important; overflow:visible !important; background:#fff !important; color:#111 !important; }
      #app, #main, .main-inner, #sheets-wrap { display:block !important; width:100% !important; height:auto !important; min-height:0 !important; max-height:none !important; overflow:visible !important; position:static !important; background:#fff !important; }
      #sidebar, .sheet-nav { display:none !important; }
      #main::before { display:none !important; content:none !important; }
      .worksheet-page { display:block !important; position:relative !important; box-sizing:border-box !important; width:100% !important; max-width:none !important; height:auto !important; min-height:0 !important; max-height:none !important; overflow:visible !important; margin:0 !important; padding:6px 7px 4px !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; background:#fff !important; color:#111 !important; animation:none !important; break-after:page !important; page-break-after:always !important; break-inside:avoid !important; page-break-inside:avoid !important; }
      .worksheet-page:last-child { break-after:auto !important; page-break-after:auto !important; }
      .page-header, .puzzle-card { break-inside:avoid !important; page-break-inside:avoid !important; }
      .page-header { border-bottom:1.5px solid #bbb !important; padding-bottom:7px !important; margin-bottom:10px !important; }
      .puzzles-grid { display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:8px !important; align-items:start !important; }
      .puzzle-card { min-width:0 !important; overflow:hidden !important; background:#fff !important; color:#111 !important; border:1px solid #ccc !important; box-shadow:none !important; }
      .puzzle-card-header { background:#f5f5f0 !important; }
      .board-wrap { width:100% !important; aspect-ratio:1 / 1 !important; height:auto !important; overflow:hidden !important; background:#fff !important; }
      canvas.brd { display:block !important; width:100% !important; height:100% !important; max-width:100% !important; background:transparent !important; filter:none !important; opacity:1 !important; }
      .puzzle-card-body { background:#fff !important; color:#111 !important; padding:7px !important; gap:5px !important; }
      .puzzle-num-lbl, .field-label, .hdr-sub, .hdr-contact, .hdr-sheet-num { color:#333 !important; }
      .hdr-sheet-title { color:#111 !important; font-size:15px !important; outline:none !important; background:transparent !important; }
      .hdr-sub { font-size:9px !important; }
      .hdr-contact { font-size:11px !important; }
      .hdr-sheet-num { font-size:9px !important; }
      .hdr-logo-ph { border-color:#ccc !important; color:#aaa !important; width:40px !important; height:40px !important; }
      .flip-btn { display:none !important; }
      .turn-bar { font-size:8px !important; padding:4px !important; }
      .turn-bar.white { background:#f0f0f0 !important; color:#111 !important; }
      .turn-bar.black { background:#2a2a3a !important; color:#fff !important; }
      .field-label { font-size:7.5px !important; }
      .answer-field { color:#111 !important; font-size:10px !important; min-height:20px !important; padding:2px !important; border-bottom-color:#333 !important; }
      .notes-textarea { color:#111 !important; font-size:9px !important; line-height:17px !important; background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 15px,rgba(0,0,0,.2) 15px,rgba(0,0,0,.2) 16px) !important; background-size:100% 17px !important; }
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

      // The subtitle is editable in the preview too. Each sheet keeps its own
      // subtitle once the user edits it.
      const subtitle = headerCenter.querySelector('.hdr-sub');
      if (subtitle) {
        subtitle.contentEditable = 'true';
        subtitle.spellcheck = false;
        subtitle.setAttribute('role', 'textbox');
        subtitle.setAttribute('aria-label', `Subtitle for sheet ${index + 1}`);
        subtitle.setAttribute('title', 'Click here to edit this sheet subtitle');
        if (!subtitle.dataset.editHandlerAttached) {
          subtitle.dataset.editHandlerAttached = 'true';
          subtitle.addEventListener('input', () => {
            sheetSubtitles[index] = subtitle.textContent.trim();
            customSheetSubtitles[index] = true;
          });
          subtitle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              subtitle.blur();
            }
          });
        }
        if (typeof sheetSubtitles[index] !== 'string') {
          sheetSubtitles[index] = $('ws-sub').value || '';
        }
        subtitle.textContent = sheetSubtitles[index];
      }
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

  $('ws-sub').addEventListener('input', () => {
    document.querySelectorAll('.worksheet-page').forEach((page, index) => {
      const subtitle = page.querySelector('.hdr-sub');
      if (!subtitle) return;
      if (customSheetSubtitles[index]) {
        subtitle.textContent = sheetSubtitles[index] || '';
      } else {
        sheetSubtitles[index] = $('ws-sub').value;
        subtitle.textContent = sheetSubtitles[index];
      }
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
    sheetSubtitles = [];
    customSheetSubtitles = [];
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
      sheetSubtitles = [];
      customSheetSubtitles = [];
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

  function redrawBoardsForPrint() {
    if (typeof allPuzzles === 'undefined' || typeof drawBoard !== 'function') return;
    document.querySelectorAll('.worksheet-page').forEach((page) => {
      page.style.display = 'block';
      page.querySelectorAll('canvas.brd').forEach((canvas) => {
        const label = canvas.closest('.puzzle-card')?.querySelector('.puzzle-num-lbl')?.textContent || '';
        const match = label.match(/Puzzle\s+(\d+)/i);
        if (!match) return;
        const puzzleIndex = Number(match[1]) - 1;
        const fen = allPuzzles[puzzleIndex];
        if (fen) drawBoard(canvas, fen, !!(typeof flipStates !== 'undefined' && flipStates[puzzleIndex]));
      });
    });
  }

  window.addEventListener('beforeprint', redrawBoardsForPrint);
})();

/* ===== Integrated print and per-sheet subtitle repair ===== */
/*
 * PuzzleSheet print and subtitle repair
 * Load AFTER multi_theme_title_patch.js.
 * - Adds a clear, per-sheet subtitle editor inside each worksheet preview.
 * - Prints worksheet pages in a clean, isolated A4 document.
 * - Converts chess canvases to PNG images before printing to avoid black blocks.
 * - Removes the app's sheet counter and avoids browser title/URL/page headers by
 *   using a zero-margin @page rule in the isolated print document.
 */
(function () {
  if (window.__worksheetPrintSubtitleFixLoaded) return;
  window.__worksheetPrintSubtitleFixLoaded = true;

  const $ = (id) => document.getElementById(id);
  let subtitleValues = [];
  let customSubtitles = [];
  let lastPuzzleSignature = null;

  const style = document.createElement('style');
  style.textContent = `
    /* The visible preview uses a real textarea so editing is obvious and reliable. */
    .worksheet-page .hdr-sub { display:none !important; }
    .worksheet-page .sheet-subtitle-editor {
      display:block; width:100%; min-height:30px; height:auto; resize:vertical;
      margin:2px 0 0; padding:4px 6px; border:1px dashed #c8bfa8;
      border-radius:4px; background:rgba(255,255,255,.72); color:#666;
      font:11px/1.45 'DM Sans',sans-serif; outline:none; overflow:hidden;
    }
    .worksheet-page .sheet-subtitle-editor:focus {
      border-color:#a07830; background:#fffdf7; box-shadow:0 0 0 2px rgba(201,168,76,.12);
    }
    .worksheet-page .sheet-subtitle-editor::placeholder { color:#999; font-style:italic; }
    @media print {
      .worksheet-page .sheet-subtitle-editor { display:none !important; }
      .worksheet-page .hdr-sub { display:block !important; }
    }
  `;
  document.head.appendChild(style);

  function fitSubtitleEditor(editor) {
    editor.style.height = 'auto';
    editor.style.height = Math.max(30, editor.scrollHeight) + 'px';
  }

  function decorateSubtitleEditors() {
    const currentPuzzles = typeof allPuzzles !== 'undefined' && Array.isArray(allPuzzles) ? allPuzzles : [];
    const signature = currentPuzzles.join('\n');
    if (signature !== lastPuzzleSignature) {
      subtitleValues = [];
      customSubtitles = [];
      lastPuzzleSignature = signature;
    }
    const defaultSubtitle = $('ws-sub') ? $('ws-sub').value : '';
    document.querySelectorAll('.worksheet-page').forEach((page, index) => {
      const header = page.querySelector('.hdr-center');
      const printedSubtitle = header && header.querySelector('.hdr-sub');
      if (!header || !printedSubtitle) return;

      let editor = header.querySelector('.sheet-subtitle-editor');
      if (!editor) {
        editor = document.createElement('textarea');
        editor.className = 'sheet-subtitle-editor';
        editor.rows = 1;
        editor.placeholder = `Edit subtitle for Sheet ${index + 1}…`;
        editor.setAttribute('aria-label', `Subtitle for worksheet sheet ${index + 1}`);
        editor.title = 'Type a different subtitle for this sheet';
        printedSubtitle.insertAdjacentElement('afterend', editor);
        editor.addEventListener('input', () => {
          subtitleValues[index] = editor.value;
          customSubtitles[index] = true;
          printedSubtitle.textContent = editor.value;
          fitSubtitleEditor(editor);
        });
        editor.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            editor.blur();
          }
        });
      }

      if (customSubtitles[index] && typeof subtitleValues[index] === 'string') {
        editor.value = subtitleValues[index];
      } else {
        subtitleValues[index] = defaultSubtitle;
        editor.value = defaultSubtitle;
      }
      printedSubtitle.textContent = editor.value;
      fitSubtitleEditor(editor);
    });
  }

  // The existing theme patch wraps buildUI first. Wrap that version so subtitle
  // editors are restored every time a worksheet is generated or regenerated.
  if (typeof window.buildUI === 'function') {
    const previousBuildUI = window.buildUI;
    window.buildUI = function () {
      const result = previousBuildUI.apply(this, arguments);
      decorateSubtitleEditors();
      return result;
    };
  }

  // The main sidebar subtitle acts as the default for sheets not individually edited.
  if ($('ws-sub')) {
    $('ws-sub').addEventListener('input', () => {
      const value = $('ws-sub').value;
      document.querySelectorAll('.worksheet-page').forEach((page, index) => {
        if (customSubtitles[index]) return;
        subtitleValues[index] = value;
        const editor = page.querySelector('.sheet-subtitle-editor');
        const printedSubtitle = page.querySelector('.hdr-sub');
        if (editor) {
          editor.value = value;
          fitSubtitleEditor(editor);
        }
        if (printedSubtitle) printedSubtitle.textContent = value;
      });
    });
  }

  if ($('clear-btn')) {
    $('clear-btn').addEventListener('click', () => {
      subtitleValues = [];
      customSubtitles = [];
      lastPuzzleSignature = null;
    });
  }

  function makePrintablePage(sourcePage, pageIndex) {
    const page = sourcePage.cloneNode(true);
    page.className = 'print-page';
    page.removeAttribute('style');

    // Copy the live text from editable preview controls into the printable text.
    const liveSubtitle = sourcePage.querySelector('.sheet-subtitle-editor');
    const subtitle = page.querySelector('.hdr-sub');
    if (subtitle) {
      subtitle.textContent = liveSubtitle ? liveSubtitle.value : (subtitleValues[pageIndex] || subtitle.textContent || '');
      subtitle.removeAttribute('contenteditable');
      subtitle.style.display = 'block';
    }
    page.querySelectorAll('.sheet-subtitle-editor').forEach((el) => el.remove());
    page.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));

    // This is the app's own "Sheet X of Y" label. Do not include it in print.
    page.querySelectorAll('.hdr-sheet-num').forEach((el) => el.remove());
    page.querySelectorAll('.flip-btn').forEach((el) => el.remove());

    // Preserve the current answers and notes, not just their original HTML values.
    const sourceInputs = sourcePage.querySelectorAll('.answer-field');
    const clonedInputs = page.querySelectorAll('.answer-field');
    sourceInputs.forEach((input, i) => {
      if (clonedInputs[i]) {
        clonedInputs[i].value = input.value;
        clonedInputs[i].setAttribute('value', input.value);
      }
    });
    const sourceNotes = sourcePage.querySelectorAll('.notes-textarea');
    const clonedNotes = page.querySelectorAll('.notes-textarea');
    sourceNotes.forEach((area, i) => {
      if (clonedNotes[i]) {
        clonedNotes[i].value = area.value;
        clonedNotes[i].textContent = area.value;
      }
    });

    // Canvas printing is inconsistent in some Chromium builds. Convert every
    // rendered chessboard to a self-contained PNG image before opening print.
    const sourceCanvases = sourcePage.querySelectorAll('canvas.brd');
    const clonedCanvases = page.querySelectorAll('canvas.brd');
    sourceCanvases.forEach((canvas, i) => {
      const targetCanvas = clonedCanvases[i];
      if (!targetCanvas) return;
      try {
        const boardImage = document.createElement('img');
        boardImage.className = 'print-board';
        boardImage.alt = 'Chess position';
        boardImage.src = canvas.toDataURL('image/png');
        targetCanvas.replaceWith(boardImage);
      } catch (error) {
        // If a remote SVG piece image tainted the canvas, redraw this board
        // temporarily with Unicode pieces. That creates a clean, exportable PNG.
        try {
          const label = canvas.closest('.puzzle-card')?.querySelector('.puzzle-num-lbl')?.textContent || '';
          const match = label.match(/Puzzle\s+(\d+)/i);
          const puzzleIndex = match ? Number(match[1]) - 1 : -1;
          const fen = puzzleIndex >= 0 && typeof allPuzzles !== 'undefined' ? allPuzzles[puzzleIndex] : null;
          const savedPieces = typeof PIECES !== 'undefined' ? { ...PIECES } : null;
          try {
            if (savedPieces) Object.keys(PIECES).forEach((key) => { PIECES[key] = null; });
            if (fen && typeof drawBoard === 'function') {
              drawBoard(canvas, fen, !!(typeof flipStates !== 'undefined' && flipStates[puzzleIndex]));
            }
            const fallbackImage = document.createElement('img');
            fallbackImage.className = 'print-board';
            fallbackImage.alt = 'Chess position';
            fallbackImage.src = canvas.toDataURL('image/png');
            targetCanvas.replaceWith(fallbackImage);
          } finally {
            if (savedPieces) Object.assign(PIECES, savedPieces);
          }
        } catch (fallbackError) {
          console.error('Fallback chessboard export also failed:', fallbackError, error);
        }
      }
    });

    return page;
  }

  function printStyles() {
    return `
      <style>
        @page { size:A4 portrait; margin:0; }
        * { box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        html, body { margin:0 !important; padding:0 !important; width:210mm !important; min-width:210mm !important; background:#fff !important; color:#111 !important; }
        body { font-family:Arial,Helvetica,sans-serif; color-scheme:light; }
        .print-page {
          display:block; position:relative; width:210mm; height:297mm; max-height:297mm;
          margin:0; padding:8mm 9mm 7mm; overflow:hidden; background:#fff; color:#111;
          page-break-after:always; break-after:page; page-break-inside:avoid; break-inside:avoid;
        }
        .print-page:last-child { page-break-after:auto; break-after:auto; }
        .page-header { display:flex; align-items:flex-start; gap:4mm; padding-bottom:3mm; margin-bottom:4mm; border-bottom:1px solid #bbb; }
        .hdr-logo-ph, .hdr-logo { display:flex; flex:0 0 14mm; width:14mm; height:14mm; object-fit:contain; align-items:center; justify-content:center; border:1px solid #ccc; border-radius:2mm; color:#999; font-size:7pt; }
        .hdr-center { flex:1 1 auto; min-width:0; }
        .hdr-sheet-title { display:block; margin:0 0 1.5mm; padding:0; color:#111; font-family:Georgia,'Times New Roman',serif; font-size:17pt; font-weight:700; line-height:1.15; overflow-wrap:anywhere; }
        .hdr-title { margin:0 0 1mm; color:#444; font-size:8pt; font-weight:600; }
        .hdr-sub { display:block !important; margin:0; padding:0; color:#555; font-size:8pt; line-height:1.35; white-space:pre-wrap; overflow-wrap:anywhere; }
        .hdr-right { text-align:right; color:#333; white-space:nowrap; font-size:8pt; }
        .hdr-contact { margin-bottom:1mm; color:#111; font-size:9pt; font-weight:700; }
        .hdr-sheet-num { display:none !important; }
        .puzzles-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:3mm; align-items:start; }
        .puzzle-card { display:flex; min-width:0; flex-direction:column; overflow:hidden; break-inside:avoid; page-break-inside:avoid; border:0.3mm solid #d5d0c6; border-radius:2mm; background:#fff; color:#111; box-shadow:none; }
        .puzzle-card-header { display:flex; align-items:center; justify-content:space-between; gap:2mm; padding:1.5mm 2mm; border-bottom:0.2mm solid #ddd; background:#f4f0e8; }
        .puzzle-num-lbl { color:#444; font-size:7pt; font-weight:700; letter-spacing:.04em; }
        .puzzle-card-header-right { display:flex; align-items:center; gap:1mm; }
        .diff-badge { padding:.5mm 1mm; border-radius:1mm; font-size:6pt; font-weight:700; }
        .board-wrap { display:block; width:100%; aspect-ratio:1 / 1; height:auto; overflow:hidden; background:#fff; }
        .print-board { display:block; width:100%; height:auto; aspect-ratio:1 / 1; object-fit:contain; background:#fff; }
        .turn-bar { padding:1.2mm 1mm; border-top:.2mm solid #ddd; text-align:center; font-size:7pt; font-weight:700; letter-spacing:.04em; }
        .turn-bar.white { background:#f0ede5; color:#222; }
        .turn-bar.black { background:#2a2a3a; color:#fff; }
        .puzzle-card-body { display:flex; flex-direction:column; gap:1.5mm; padding:2mm; background:#fff; }
        .answer-row, .notes-section { display:flex; flex-direction:column; gap:.5mm; }
        .field-label { color:#666; font-size:6pt; font-weight:700; letter-spacing:.05em; }
        .answer-field { width:100%; min-height:5mm; padding:.5mm 0; border:0; border-bottom:.25mm solid #777; border-radius:0; background:transparent; color:#111; font-size:8pt; }
        .notes-textarea { display:block; width:100%; min-height:9mm; padding:0; resize:none; border:0; background:repeating-linear-gradient(to bottom,transparent 0,transparent 4mm,rgba(0,0,0,.17) 4mm,rgba(0,0,0,.17) 4.2mm); color:#111; font-size:7pt; line-height:4mm; overflow:hidden; }
        .flip-btn, .sheet-nav, .nav-print-btn, .sheet-subtitle-editor { display:none !important; }
        @media screen {
          html,body { width:auto !important; min-width:0 !important; background:#777 !important; }
          .print-page { margin:8mm auto; box-shadow:0 1mm 5mm rgba(0,0,0,.25); }
        }
      </style>`;
  }

  let printInProgress = false;
  function printAllWorksheets() {
    if (printInProgress) return;
    const sourcePages = Array.from(document.querySelectorAll('.worksheet-page'));
    if (!sourcePages.length) {
      alert('Generate worksheets before printing.');
      return;
    }

    // Open the blank print tab synchronously inside the user's click so that
    // popup blockers do not reject it while boards are being prepared.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Your browser blocked the print tab. Allow pop-ups for this website, then click Print / Save PDF again.');
      return;
    }

    printInProgress = true;
    printWindow.document.open();
    printWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title> </title></head><body><p style="font:14px Arial;padding:20px">Preparing worksheets for printing…</p></body></html>');
    printWindow.document.close();

    (async () => {
      try {
        if (typeof pieceImagesReady !== 'undefined') {
          await Promise.race([pieceImagesReady, new Promise(resolve => setTimeout(resolve, 2500))]);
        }
        // Redraw all positions before taking snapshots, including pages hidden in
        // the preview tabs. Their hidden display state does not affect canvas size.
        if (typeof allPuzzles !== 'undefined' && typeof drawBoard === 'function') {
          sourcePages.forEach((page) => {
            page.querySelectorAll('canvas.brd').forEach((canvas) => {
              const label = canvas.closest('.puzzle-card')?.querySelector('.puzzle-num-lbl')?.textContent || '';
              const match = label.match(/Puzzle\s+(\d+)/i);
              if (!match) return;
              const puzzleIndex = Number(match[1]) - 1;
              const fen = allPuzzles[puzzleIndex];
              if (fen) drawBoard(canvas, fen, !!(typeof flipStates !== 'undefined' && flipStates[puzzleIndex]));
            });
          });
        }

        const printable = sourcePages.map(makePrintablePage);
        printWindow.document.open();
        printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${printStyles()}<title> </title></head><body></body></html>`);
        const targetBody = printWindow.document.body;
        printable.forEach((page) => targetBody.appendChild(printWindow.document.importNode(page, true)));
        printWindow.document.close();

        // Wait for all embedded images to be decoded before invoking the printer.
        const images = Array.from(printWindow.document.images);
        await Promise.all(images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 3000);
          });
        }));
        await new Promise(resolve => setTimeout(resolve, 250));
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => {
          try { printWindow.close(); } catch (_) {}
        };
      } catch (error) {
        console.error('Worksheet print preparation failed:', error);
        alert('The print view could not be prepared. Please allow pop-ups for this website and try again.');
        try { printWindow.close(); } catch (_) {}
      } finally {
        printInProgress = false;
      }
    })();
  }

  // Capture the print buttons before the original handlers run. The app's
  // buttons and the per-preview "Print all" button both use this clean print view.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#print-btn, .nav-print-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    printAllWorksheets();
  }, true);

  // Keep Ctrl/Cmd+P on the same print path as the app's Print button.
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      printAllWorksheets();
    }
  }, true);

  // Existing code may call window.print() directly; route it through the clean view.
  try { window.print = printAllWorksheets; } catch (error) {
    console.warn('Could not replace the native print function; use the Print / Save PDF button.', error);
  }

  // Add editors to already-rendered pages in case the patch was loaded late.
  decorateSubtitleEditors();
})();
