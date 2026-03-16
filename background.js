chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (result) => {
    chrome.storage.local.set({
      isEnabled: result.isEnabled !== false,
      disabledDomains: result.disabledDomains || {},
      oneTimePreDownloadName: result.oneTimePreDownloadName || "",
      globalPath: result.globalPath || "",
      customPaths: result.customPaths || {},
      byCustomPath: result.byCustomPath !== undefined ? result.byCustomPath : false,
      globalKeywordRules: result.globalKeywordRules || [], 
      domainKeywordRules: result.domainKeywordRules || {}, 
      byDomain: result.byDomain !== false,
      byFileType: result.byFileType !== undefined ? result.byFileType : true,
      byDate: result.byDate !== undefined ? result.byDate : false,
      byKeyword: result.byKeyword || false,
      globalRuleOrder: result.globalRuleOrder || ['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath'],
      siteRuleOrders: result.siteRuleOrders || {},
      siteRuleEnabled: result.siteRuleEnabled || {},
      useSiteRuleOrder: result.useSiteRuleOrder || {}
    });
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'open_grouper_popup') return;
  if (!chrome.action || typeof chrome.action.openPopup !== 'function') return;
  chrome.action.openPopup().catch(() => {
    // Some browser builds restrict programmatic popup opening.
  });
});

function buildFinalPath(item, result, domain, basename) {
  let pathParts = [];
  const isSiteSpecificMode = result.useSiteRuleOrder && result.useSiteRuleOrder[domain] === true;
  const siteEnabledRules = ((result.siteRuleEnabled || {})[domain]) || {};
  const isRuleEnabled = (rule) => {
    if (isSiteSpecificMode && Object.prototype.hasOwnProperty.call(siteEnabledRules, rule)) {
      return siteEnabledRules[rule] === true;
    }
    return result[rule] === true;
  };

  let order = result.globalRuleOrder || ['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath'];
  if (result.useSiteRuleOrder && result.useSiteRuleOrder[domain] && result.siteRuleOrders && result.siteRuleOrders[domain]) {
    order = result.siteRuleOrders[domain];
  }

  order = order.filter(r => ['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath'].includes(r));

  order.forEach(rule => {
    if (!isRuleEnabled(rule)) return;

    if (rule === 'byDomain') pathParts.push(domain.replace(/[^a-z0-9.-]/gi, '_'));
    if (rule === 'byDate') {
      const d = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      pathParts.push(`${d.getFullYear()}-${months[d.getMonth()]}`);
    }
    if (rule === 'byFileType') {
      const ext = basename.includes('.') ? basename.split('.').pop().toLowerCase() : '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) pathParts.push('Images');
      else if (['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'].includes(ext)) pathParts.push('Documents');
      else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) pathParts.push('Videos');
      else if (['mp3', 'wav', 'ogg'].includes(ext)) pathParts.push('Audio');
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) pathParts.push('Archives');
      else pathParts.push('Other');
    }
    if (rule === 'byKeyword') {
      const lowerFilename = basename.toLowerCase();
      let matchedFolder = null;
      const domainRules = (result.domainKeywordRules || {})[domain] || [];
      for (let kr of domainRules) {
        if (kr.keyword && kr.folder && lowerFilename.includes(kr.keyword.toLowerCase())) { matchedFolder = kr.folder; break; }
      }
      if (!matchedFolder && !isSiteSpecificMode) {
        const globalRules = result.globalKeywordRules || [];
        for (let kr of globalRules) {
          if (kr.keyword && kr.folder && lowerFilename.includes(kr.keyword.toLowerCase())) { matchedFolder = kr.folder; break; }
        }
      }
      if (matchedFolder) pathParts.push(sanitizePath(matchedFolder));
    }
    if (rule === 'byCustomPath') {
      const customPaths = result.customPaths || {};
      const domainPath = customPaths[domain];
      const globalPath = result.globalPath;
      if (domainPath && domainPath.trim() !== '') {
        pathParts.push(sanitizePath(domainPath));
      } else if (!isSiteSpecificMode && globalPath && globalPath.trim() !== '') {
        pathParts.push(sanitizePath(globalPath));
      }
    }
  });

  return pathParts.length > 0 ? pathParts.join('/') + '/' + basename : basename;
}

function sanitizePath(p) {
  return p.replace(/\.\./g, '').replace(/[<>:"|?*\x00-\x1f]/g, '_').replace(/\\+/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
}

function sanitizeOneTimeNameText(text) {
  return String(text || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/[. ]+$/g, '')
    .slice(0, 180);
}

function getExtensionPart(filename) {
  const idx = filename.lastIndexOf('.');
  if (idx <= 0) return '';
  return filename.slice(idx);
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  chrome.storage.local.get(null, (result) => {
    if (!result.isEnabled) return suggest();

    try {
      let targetUrl = item.referrer || item.url;
      if (targetUrl.startsWith('blob:')) targetUrl = targetUrl.substring(5);
      let domain = 'Other';
      try { domain = new URL(targetUrl).hostname.replace(/^www\./, ''); } catch (e) {}

      if (result.disabledDomains && result.disabledDomains[domain]) return suggest();

      const basename = item.filename.split(/[\/\\]/).pop() || item.filename;
      const oneTimeText = sanitizeOneTimeNameText(result.oneTimePreDownloadName);
      const basenameForDownload = oneTimeText ? `${oneTimeText}${getExtensionPart(basename)}` : basename;

      const finalPath = buildFinalPath(item, result, domain, basenameForDownload);
      suggest({ filename: finalPath, conflictAction: 'uniquify' });

      // One-time value is consumed by the first detected download only.
      if (oneTimeText) {
        chrome.storage.local.set({ oneTimePreDownloadName: '' }, () => {
          chrome.runtime.sendMessage({ type: 'oneTimeNameConsumed' }, () => {
            void chrome.runtime.lastError;
          });
        });
      }

    } catch (error) {
      console.error("Routing error:", error);
      suggest(); 
    }
  });
  return true; 
});