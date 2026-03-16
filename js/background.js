const EXTENSION_MAP = {
  jpg: 'JPEG Image', jpeg: 'JPEG Image', png: 'PNG Image',
  gif: 'GIF Image', webp: 'WebP Image', svg: 'SVG Vector',
  heic: 'High Efficiency Image', tiff: 'TIFF Image', bmp: 'Bitmap Image',
  psd: 'Photoshop Document', ai: 'Illustrator Document', xd: 'Adobe XD',
  fig: 'Figma File', sketch: 'Sketch Design', indd: 'InDesign Document',
  pdf: 'PDF Document',
  doc: 'Word Document', docx: 'Word Document', dotx: 'Word Template',
  xls: 'Excel Spreadsheet', xlsx: 'Excel Spreadsheet', xlsm: 'Excel Macro-Enabled',
  ppt: 'PowerPoint Presentation', pptx: 'PowerPoint Presentation', ppsx: 'PowerPoint Show',
  txt: 'Text File', rtf: 'Rich Text Format', md: 'Markdown Documentation',
  epub: 'E-Book Publication', mobi: 'Kindle eBook',
  mp4: 'MP4 Video', mkv: 'Matroska Video', mov: 'QuickTime Video',
  avi: 'AVI Video', webm: 'WebM Video', flv: 'Flash Video',
  wmv: 'Windows Media Video', m4v: 'iTunes Video',
  mp3: 'MP3 Audio', wav: 'WAV Audio', ogg: 'Ogg Vorbis',
  flac: 'FLAC Audio', aac: 'AAC Audio', m4a: 'Apple Audio',
  mid: 'MIDI Audio', wma: 'Windows Media Audio',
  zip: 'ZIP Archive', rar: 'RAR Archive', '7z': '7-Zip Archive',
  tar: 'Tarball Archive', gz: 'Gzip Archive', iso: 'Disk Image',
  dmg: 'macOS Disk Image', pkg: 'macOS Package',
  html: 'HTML Document', css: 'CSS Style Sheet', js: 'JavaScript Code',
  ts: 'TypeScript Code', json: 'JSON Data', xml: 'XML Data',
  py: 'Python Script', rb: 'Ruby Script', php: 'PHP Script',
  cpp: 'C++ Source', c: 'C Source', java: 'Java Source',
  sh: 'Shell Script', sql: 'SQL Database Query', yaml: 'YAML Config',
  dockerfile: 'Docker Configuration', yml: 'YAML Config',
  obj: '3D Object', stl: 'Stereolithography File', fbx: 'FilmBox 3D',
  blend: 'Blender Project', dwg: 'AutoCAD Drawing',
  ttf: 'TrueType Font', otf: 'OpenType Font', woff: 'Web Font', woff2: 'Web Font',
  exe: 'Windows Executable', msi: 'Windows Installer', bin: 'Binary File',
  dll: 'System Library', sys: 'System File', bat: 'Batch Script'
};

const sanitizePath = (p) => p.replace(/\.\./g, '').replace(/[<>:"|?*\x00-\x1f]/g, '_').replace(/\\+/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
const sanitizeOneTimeNameText = (text) => String(text || '').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/[. ]+$/g, '').slice(0, 180);
const getExtensionPart = (filename) => {
  const idx = filename.lastIndexOf('.');
  return idx <= 0 ? '' : filename.slice(idx);
};

const RULE_HANDLERS = {
  byDomain: (result, domain) => {
    const domainConfig = result.folderNameConfig?.[domain] || {};
    if (domainConfig.useDefault === false && domainConfig.segments?.length > 0) {
      return domainConfig.segments.join('_');
    }
    const parts = domain.split('.');
    return parts.length > 1 ? parts[parts.length - 2] : domain;
  },
  byDate: () => {
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${now.getFullYear()}-${months[now.getMonth()]}`;
  },
  byFileType: (result, domain, basename) => {
    const ext = basename.includes('.') ? basename.split('.').pop().toLowerCase() : '';
    return EXTENSION_MAP[ext] || (ext === '' && basename !== '' ? 'System or Config File' : 'Other');
  },
  byKeyword: (result, domain, basename, isSiteSpecificMode) => {
    const lowerFilename = basename.toLowerCase();
    const findFolder = (rules) => rules.find(kr => kr.keyword && kr.folder && lowerFilename.includes(kr.keyword.toLowerCase()))?.folder;
    
    let matchedFolder = findFolder(result.domainKeywordRules?.[domain] || []);
    if (!matchedFolder && !isSiteSpecificMode) {
      matchedFolder = findFolder(result.globalKeywordRules || []);
    }
    return matchedFolder ? sanitizePath(matchedFolder) : null;
  },
  byCustomPath: (result, domain, basename, isSiteSpecificMode) => {
    const domainPath = result.customPaths?.[domain];
    if (domainPath?.trim()) return sanitizePath(domainPath);
    if (!isSiteSpecificMode && result.globalPath?.trim()) return sanitizePath(result.globalPath);
    return null;
  }
};

function buildFinalPath(item, result, domain, basename) {
  const isSiteSpecificMode = result.useSiteRuleOrder?.[domain] === true;
  const siteEnabledRules = result.siteRuleEnabled?.[domain] || {};
  
  const isRuleEnabled = (rule) => isSiteSpecificMode && Object.hasOwn(siteEnabledRules, rule) ? siteEnabledRules[rule] : result[rule] === true;

  const validRules = new Set(['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath']);
  const defaultOrder = ['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath'];
  
  let order = result.globalRuleOrder || defaultOrder;
  if (isSiteSpecificMode && result.siteRuleOrders?.[domain]) order = result.siteRuleOrders[domain];

  const pathParts = order
    .filter(r => validRules.has(r) && isRuleEnabled(r))
    .map(rule => RULE_HANDLERS[rule]?.(result, domain, basename, isSiteSpecificMode))
    .filter(Boolean);

  return pathParts.length > 0 ? pathParts.join('/') + '/' + basename : basename;
}

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
      useSiteRuleOrder: result.useSiteRuleOrder || {},
      folderNameConfig: result.folderNameConfig || {}
    });
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'open_grouper_popup') return;
  chrome.action?.openPopup?.().catch(() => {});
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  chrome.storage.local.get(null, (result) => {
    if (!result.isEnabled) return suggest();

    try {
      let targetUrl = item.referrer || item.url;
      if (targetUrl.startsWith('blob:')) targetUrl = targetUrl.substring(5);
      let domain = 'Other';
      try {
        domain = new URL(targetUrl).hostname.replace(/^www\./, '');
      } catch (e) { }
      if (!domain) domain = 'Other';

      const processDownload = (resolvedDomain) => {
        if (result.disabledDomains && result.disabledDomains[resolvedDomain]) return suggest();

        const basename = item.filename.split(/[\/\\]/).pop() || item.filename;
        const oneTimeText = sanitizeOneTimeNameText(result.oneTimePreDownloadName);
        const basenameForDownload = oneTimeText ? `${oneTimeText}${getExtensionPart(basename)}` : basename;

        const finalPath = buildFinalPath(item, result, resolvedDomain, basenameForDownload);
        suggest({ filename: finalPath, conflictAction: 'uniquify' });

        if (oneTimeText) {
          chrome.storage.local.set({ oneTimePreDownloadName: '' }, () => {
            chrome.runtime.sendMessage({ type: 'oneTimeNameConsumed' }, () => {
              void chrome.runtime.lastError;
            });
          });
        }
      };

      if (domain === 'Other') {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0 && tabs[0].url) {
            try {
              domain = new URL(tabs[0].url).hostname.replace(/^www\./, '') || 'Other';
            } catch (e) {}
          }
          processDownload(domain);
        });
      } else {
        processDownload(domain);
      }
    } catch (error) {
      console.error("Routing error:", error);
      suggest();
    }
  });
  return true;
});