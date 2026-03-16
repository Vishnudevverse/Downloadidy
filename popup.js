document.addEventListener('DOMContentLoaded', () => {
  let currentDomain = 'Other';
  let currentDomainDisplay = 'This Site';
  let localState = {};
  let isDirty = false;
  let themePreference = 'system';
  let oneTimeNameInput = null;
  const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const hostname = (new URL(tabs[0].url).hostname || '').replace(/^www\./, '');
        if (hostname) {
          currentDomain = hostname;
          currentDomainDisplay = hostname;
        }
      } catch(e) {}
    }
    document.querySelectorAll('.currentDomainLabel').forEach(el => el.textContent = currentDomainDisplay);
    
    chrome.storage.local.get(null, (result) => {
      // 1. Filter out the bad rules from previous versions so they vanish from the UI permanently
      const validRules = ['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath'];
      let cleanedGlobalOrder = (result.globalRuleOrder || validRules).filter(r => validRules.includes(r));
      // Ensure new rules are added for users upgrading from older versions
      validRules.forEach(r => { if (!cleanedGlobalOrder.includes(r)) cleanedGlobalOrder.push(r); });
      let cleanedSiteOrders = result.siteRuleOrders || {};
      for (let domain in cleanedSiteOrders) {
        cleanedSiteOrders[domain] = cleanedSiteOrders[domain].filter(r => validRules.includes(r));
        validRules.forEach(r => { if (!cleanedSiteOrders[domain].includes(r)) cleanedSiteOrders[domain].push(r); });
      }

      localState = {
        isEnabled: result.isEnabled !== false,
        disabledDomains: result.disabledDomains || {},
        oneTimePreDownloadName: result.oneTimePreDownloadName || '',
        globalPath: result.globalPath || "",
        customPaths: result.customPaths || {},
        byCustomPath: result.byCustomPath !== undefined ? result.byCustomPath : false,
        globalKeywordRules: result.globalKeywordRules || [],
        domainKeywordRules: result.domainKeywordRules || {},
        byDomain: result.byDomain !== false,
        byFileType: result.byFileType !== undefined ? result.byFileType : true,
        byDate: result.byDate !== undefined ? result.byDate : false,
        byKeyword: result.byKeyword || false,
        globalRuleOrder: cleanedGlobalOrder,
        siteRuleOrders: cleanedSiteOrders,
        siteRuleEnabled: result.siteRuleEnabled || {},
        useSiteRuleOrder: result.useSiteRuleOrder || {}
      };

      themePreference = ['light', 'dark', 'system'].includes(result.themePreference) ? result.themePreference : 'system';
      
      initUI();
      applyTheme(themePreference);
    });
  });

  function initUI() {
    oneTimeNameInput = document.getElementById('oneTimeDownloadName');
    oneTimeNameInput.value = localState.oneTimePreDownloadName || '';
    oneTimeNameInput.addEventListener('input', (e) => {
      localState.oneTimePreDownloadName = e.target.value;
      chrome.storage.local.set({ oneTimePreDownloadName: e.target.value });
    });

    // Focus directly in the one-time name field when popup opens.
    setTimeout(() => {
      if (!oneTimeNameInput) return;
      oneTimeNameInput.focus();
      oneTimeNameInput.select();
    }, 0);

    chrome.runtime.onMessage.addListener((message) => {
      if (!message || message.type !== 'oneTimeNameConsumed') return;
      localState.oneTimePreDownloadName = '';
      if (oneTimeNameInput) oneTimeNameInput.value = '';
    });

    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        themePreference = btn.dataset.theme;
        applyTheme(themePreference);
        chrome.storage.local.set({ themePreference });
      });
    });

    if (prefersDarkQuery.addEventListener) {
      prefersDarkQuery.addEventListener('change', () => {
        if (themePreference === 'system') applyTheme('system');
      });
    } else if (prefersDarkQuery.addListener) {
      prefersDarkQuery.addListener(() => {
        if (themePreference === 'system') applyTheme('system');
      });
    }

    // Top Modern Checkboxes
    document.getElementById('isEnabled').checked = localState.isEnabled;
    document.getElementById('isEnabled').addEventListener('change', e => {
      localState.isEnabled = e.target.checked;
      updateGreyOutState();
      checkDirty();
    });

    document.getElementById('siteEnabled').checked = !localState.disabledDomains[currentDomain];
    document.getElementById('siteEnabled').addEventListener('change', e => {
      if (e.target.checked) delete localState.disabledDomains[currentDomain];
      else localState.disabledDomains[currentDomain] = true;
      updateGreyOutState();
      checkDirty();
    });

    // Custom Path Inputs
    document.getElementById('customPathInput').addEventListener('input', (e) => {
      const scope = document.querySelector('input[name="pathScope"]:checked').value;
      if (scope === 'global') localState.globalPath = e.target.value;
      else localState.customPaths[currentDomain] = e.target.value;
      checkDirty();
    });
    document.querySelectorAll('input[name="pathScope"]').forEach(r => r.addEventListener('change', () => { renderPathUI(); checkDirty(); }));
    document.getElementById('clearPathBtn').addEventListener('click', () => {
      document.getElementById('customPathInput').value = '';
      document.getElementById('customPathInput').dispatchEvent(new Event('input'));
    });

    // Keywords
    document.querySelectorAll('input[name="kwScope"]').forEach(r => r.addEventListener('change', () => { renderKwUI(); checkDirty(); }));
    document.getElementById('addKeywordBtn').addEventListener('click', () => {
      addKeywordRow();
      checkDirty();
    });

    // --- NEW: Global Order Checkbox Logic ---
    const globalOrderCheckbox = document.getElementById('useGlobalOrder');
    // If we are using site order for this domain, then Global is unchecked
    const isUsingSiteOrder = localState.useSiteRuleOrder[currentDomain] === true;
    globalOrderCheckbox.checked = !isUsingSiteOrder;
    updateGlobalOrderLabel(!isUsingSiteOrder);

    globalOrderCheckbox.addEventListener('change', (e) => {
      const isGlobal = e.target.checked;
      localState.useSiteRuleOrder[currentDomain] = !isGlobal; // Save opposite state
      
      // If switching to site-specific and an array doesn't exist yet, clone the global one
      if (!isGlobal && !localState.siteRuleOrders[currentDomain]) {
        localState.siteRuleOrders[currentDomain] = [...localState.globalRuleOrder];
      }
      if (!isGlobal && !localState.siteRuleEnabled[currentDomain]) {
        localState.siteRuleEnabled[currentDomain] = {
          byDomain: localState.byDomain === true,
          byDate: localState.byDate === true,
          byFileType: localState.byFileType === true,
          byKeyword: localState.byKeyword === true,
          byCustomPath: localState.byCustomPath === true
        };
      }
      
      updateGlobalOrderLabel(isGlobal);
      renderRuleList();
      toggleKeywordSection();
      toggleCustomPathSection();
      checkDirty();
    });

    renderRuleList();
    renderPathUI();
    renderKwUI();
    toggleKeywordSection();
    toggleCustomPathSection();
    updateGreyOutState();
  }

  function applyTheme(mode) {
    const effectiveMode = mode === 'system' ? (prefersDarkQuery.matches ? 'dark' : 'light') : mode;
    document.documentElement.setAttribute('data-theme', effectiveMode);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === mode);
    });
  }

  function updateGlobalOrderLabel(isGlobal) {
    const label = document.getElementById('useGlobalOrderLabel');
    label.textContent = isGlobal ? 'Global' : currentDomainDisplay;
    if (isGlobal) {
      label.style.color = '#1a73e8'; // Active Blue
    } else {
      label.style.color = '#666';    // Inactive Grey
    }
  }

  // --- RULE LIST & DRAG LOGIC ---
  function getRuleEnabledForCurrentMode(ruleId) {
    const isGlobal = document.getElementById('useGlobalOrder').checked;
    if (isGlobal) return localState[ruleId] === true;
    const siteEnabled = (localState.siteRuleEnabled && localState.siteRuleEnabled[currentDomain]) || {};
    if (Object.prototype.hasOwnProperty.call(siteEnabled, ruleId)) return siteEnabled[ruleId] === true;
    return localState[ruleId] === true;
  }

  function renderRuleList() {
    const listContainer = document.getElementById('rule-list');
    listContainer.innerHTML = ''; 
    const isGlobal = document.getElementById('useGlobalOrder').checked;
    
    let currentOrderArray = isGlobal ? localState.globalRuleOrder : (localState.siteRuleOrders[currentDomain] || [...localState.globalRuleOrder]);

    const labels = { 
      byDomain: "Group by Domain", byDate: "Group by Date", byFileType: "Group by File Type", byKeyword: "By Keyword Rules", byCustomPath: "Custom Path"
    };
    
    currentOrderArray.forEach(id => {
      if (!labels[id]) return; // Failsafe against rendering old deleted rules
      const row = document.createElement('div');
      row.className = 'draggable'; row.draggable = true; row.dataset.id = id;
      row.innerHTML = `<span class="drag-handle">☰</span><span class="label-text">${labels[id]}</span><input type="checkbox" id="${id}" class="modern-checkbox" ${getRuleEnabledForCurrentMode(id) ? 'checked' : ''}>`;
      listContainer.appendChild(row);
      
      row.querySelector('input').addEventListener('change', (e) => {
        if (isGlobal) {
          localState[id] = e.target.checked;
        } else {
          if (!localState.siteRuleEnabled) localState.siteRuleEnabled = {};
          if (!localState.siteRuleEnabled[currentDomain]) localState.siteRuleEnabled[currentDomain] = {};
          localState.siteRuleEnabled[currentDomain][id] = e.target.checked;
        }
        if (id === 'byKeyword') toggleKeywordSection();
        if (id === 'byCustomPath') toggleCustomPathSection();
        checkDirty();
      });
    });
    
    setupDragAndDrop(listContainer);
  }

  function setupDragAndDrop(container) {
    let draggedItem = null;
    container.addEventListener('dragstart', (e) => { if (e.target.classList.contains('draggable')) { draggedItem = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); }});
    container.addEventListener('dragend', (e) => { 
      if (!draggedItem) return; 
      e.target.classList.remove('dragging'); 
      const newOrder = [...container.querySelectorAll('.draggable')].map(el => el.dataset.id);
      
      if (document.getElementById('useGlobalOrder').checked) {
        localState.globalRuleOrder = newOrder;
      } else {
        localState.siteRuleOrders[currentDomain] = newOrder;
      }
      draggedItem = null;
      checkDirty();
    });
    container.addEventListener('dragover', (e) => { e.preventDefault(); const after = [...container.querySelectorAll('.draggable:not(.dragging)')].reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = e.clientY - box.top - box.height / 2; return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest; }, { offset: Number.NEGATIVE_INFINITY }).element; after ? container.insertBefore(draggedItem, after) : container.appendChild(draggedItem); });
  }

  // --- PATH LOGIC ---
  function renderPathUI() {
    const scope = document.querySelector('input[name="pathScope"]:checked').value;
    document.getElementById('customPathInput').value = scope === 'global' ? localState.globalPath : (localState.customPaths[currentDomain] || "");
  }

  function toggleCustomPathSection() {
    const box = document.getElementById('custom-path-box');
    box.style.display = getRuleEnabledForCurrentMode('byCustomPath') ? 'flex' : 'none';
    updateSectionPairVisibility();
  }

  // --- KEYWORD LOGIC ---
  function renderKwUI() {
    const scope = document.querySelector('input[name="kwScope"]:checked').value;
    const rules = scope === 'global' ? localState.globalKeywordRules : (localState.domainKeywordRules[currentDomain] || []);
    const container = document.getElementById('keyword-rows-container');
    container.innerHTML = ''; 
    rules.forEach(rule => addKeywordRow(rule.keyword, rule.folder));
  }

  function addKeywordRow(kw = '', folder = '') {
    const row = document.createElement('div');
    row.className = 'keyword-row';

    const kwInput = document.createElement('input');
    kwInput.type = 'text';
    kwInput.className = 'kw-match';
    kwInput.placeholder = 'If filename has...';
    kwInput.value = kw;

    const arrow = document.createElement('span');
    arrow.textContent = '\u27A4';

    const folderInput = document.createElement('input');
    folderInput.type = 'text';
    folderInput.className = 'kw-folder';
    folderInput.placeholder = 'Folder';
    folderInput.value = folder;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-kw';
    removeBtn.textContent = '\u00D7';

    row.appendChild(kwInput);
    row.appendChild(arrow);
    row.appendChild(folderInput);
    row.appendChild(removeBtn);

    kwInput.addEventListener('input', saveKeywordStateFromUI);
    folderInput.addEventListener('input', saveKeywordStateFromUI);
    removeBtn.addEventListener('click', () => { row.remove(); saveKeywordStateFromUI(); });

    document.getElementById('keyword-rows-container').appendChild(row);
  }

  function saveKeywordStateFromUI() {
    const scope = document.querySelector('input[name="kwScope"]:checked').value;
    const rules = [];
    document.querySelectorAll('.keyword-row').forEach(row => {
      const keyword = row.querySelector('.kw-match').value.trim();
      const folder = row.querySelector('.kw-folder').value.trim();
      if (keyword || folder) rules.push({ keyword, folder });
    });
    if (scope === 'global') localState.globalKeywordRules = rules;
    else {
      if (!localState.domainKeywordRules) localState.domainKeywordRules = {};
      localState.domainKeywordRules[currentDomain] = rules;
    }
    checkDirty();
  }

  function toggleKeywordSection() {
    const kwSection = document.getElementById('keyword-section-wrapper');
    kwSection.style.display = getRuleEnabledForCurrentMode('byKeyword') ? 'flex' : 'none';
    updateSectionPairVisibility();
  }

  function updateSectionPairVisibility() {
    const customPathBox = document.getElementById('custom-path-box');
    const keywordBox = document.getElementById('keyword-section-wrapper');
    const bothEnabled = getRuleEnabledForCurrentMode('byCustomPath') && getRuleEnabledForCurrentMode('byKeyword');

    customPathBox.classList.toggle('pair-visible', bothEnabled);
    keywordBox.classList.toggle('pair-visible', bothEnabled);
  }

  function updateGreyOutState() {
    const mainContent = document.getElementById('main-content');
    const siteWrapper = document.getElementById('siteEnabledWrapper');
    if (!localState.isEnabled) {
      mainContent.classList.add('greyed-out');
      siteWrapper.classList.add('greyed-out');
    } else if (localState.disabledDomains[currentDomain]) {
      siteWrapper.classList.remove('greyed-out');
      mainContent.classList.add('greyed-out');
    } else {
      siteWrapper.classList.remove('greyed-out');
      mainContent.classList.remove('greyed-out');
    }
  }

  function checkDirty() {
    isDirty = true;
    const btn = document.getElementById('topSaveBtn');
    btn.classList.add('btn-blink');
    btn.title = 'Save';
    btn.setAttribute('aria-label', 'Save');
  }

  // --- MASTER SAVE ---
  document.getElementById('topSaveBtn').addEventListener('click', () => {
    chrome.storage.local.set(localState, () => {
      isDirty = false;
      const btn = document.getElementById('topSaveBtn');
      btn.classList.remove('btn-blink');
      btn.title = 'Saved';
      btn.setAttribute('aria-label', 'Saved');
      btn.style.background = "#28a745";
      setTimeout(() => {
        btn.title = 'Save';
        btn.setAttribute('aria-label', 'Save');
        btn.style.background = "";
      }, 1500);
    });
  });

  document.getElementById('openDownloadsBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const isEdge = /Edg\//.test(navigator.userAgent);
    const downloadsUrl = isEdge ? 'edge://downloads' : 'chrome://downloads';
    chrome.tabs.create({ url: downloadsUrl });
  });

  document.getElementById('openSettingsBtn').addEventListener('click', (e) => {
    e.preventDefault(); chrome.tabs.create({ url: 'edge://settings/downloads' });
  });
});