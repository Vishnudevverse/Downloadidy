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

  const getFolderName = () => {
    const config = result.folderNameConfig || {};
    const domainConfig = config[domain] || {};
  
    if (domainConfig.useDefault === false && domainConfig.segments && domainConfig.segments.length > 0) {
      return domainConfig.segments.join('_');
    }
  
    // Default behavior: extract SLD
    const parts = domain.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 2];
    }
    return domain;
  };

  let order = result.globalRuleOrder || ['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath'];
  if (result.useSiteRuleOrder && result.useSiteRuleOrder[domain] && result.siteRuleOrders && result.siteRuleOrders[domain]) {
    order = result.siteRuleOrders[domain];
  }

  order = order.filter(r => ['byDomain', 'byDate', 'byFileType', 'byKeyword', 'byCustomPath'].includes(r));

  order.forEach(rule => {
    if (!isRuleEnabled(rule)) return;

    switch (rule) {
      case 'byDomain':
        pathParts.push(getFolderName());
        break;
      case 'byDate':
        const now = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        pathParts.push(`${now.getFullYear()}-${months[now.getMonth()]}`);
        break;
      case 'byFileType':
        const ext = basename.includes('.') ? basename.split('.').pop().toLowerCase() : '';
        const extensionMap = {
          'jpg': 'JPEG Image', 'jpeg': 'JPEG Image', 'png': 'PNG Image',
          'gif': 'GIF Image', 'webp': 'WebP Image', 'svg': 'SVG Vector',
          'heic': 'High Efficiency Image', 'tiff': 'TIFF Image', 'bmp': 'Bitmap Image',
          'psd': 'Photoshop Document', 'ai': 'Illustrator Document', 'xd': 'Adobe XD',
          'fig': 'Figma File', 'sketch': 'Sketch Design', 'indd': 'InDesign Document',
          'pdf': 'PDF Document',
          'doc': 'Word Document', 'docx': 'Word Document', 'dotx': 'Word Template',
          'xls': 'Excel Spreadsheet', 'xlsx': 'Excel Spreadsheet', 'xlsm': 'Excel Macro-Enabled',
          'ppt': 'PowerPoint Presentation', 'pptx': 'PowerPoint Presentation', 'ppsx': 'PowerPoint Show',
          'txt': 'Text File', 'rtf': 'Rich Text Format', 'md': 'Markdown Documentation',
          'epub': 'E-Book Publication', 'mobi': 'Kindle eBook',
          'mp4': 'MP4 Video', 'mkv': 'Matroska Video', 'mov': 'QuickTime Video',
          'avi': 'AVI Video', 'webm': 'WebM Video', 'flv': 'Flash Video',
          'wmv': 'Windows Media Video', 'm4v': 'iTunes Video',
          'mp3': 'MP3 Audio', 'wav': 'WAV Audio', 'ogg': 'Ogg Vorbis',
          'flac': 'FLAC Audio', 'aac': 'AAC Audio', 'm4a': 'Apple Audio',
          'mid': 'MIDI Audio', 'wma': 'Windows Media Audio',
          'zip': 'ZIP Archive', 'rar': 'RAR Archive', '7z': '7-Zip Archive',
          'tar': 'Tarball Archive', 'gz': 'Gzip Archive', 'iso': 'Disk Image',
          'dmg': 'macOS Disk Image', 'pkg': 'macOS Package',
          'html': 'HTML Document', 'css': 'CSS Style Sheet', 'js': 'JavaScript Code',
          'ts': 'TypeScript Code', 'json': 'JSON Data', 'xml': 'XML Data',
          'py': 'Python Script', 'rb': 'Ruby Script', 'php': 'PHP Script',
          'cpp': 'C++ Source', 'c': 'C Source', 'java': 'Java Source',
          'sh': 'Shell Script', 'sql': 'SQL Database Query', 'yaml': 'YAML Config',
          'dockerfile': 'Docker Configuration', 'yml': 'YAML Config',
          'obj': '3D Object', 'stl': 'Stereolithography File', 'fbx': 'FilmBox 3D',
          'blend': 'Blender Project', 'dwg': 'AutoCAD Drawing',
          'ttf': 'TrueType Font', 'otf': 'OpenType Font', 'woff': 'Web Font', 'woff2': 'Web Font',
          'exe': 'Windows Executable', 'msi': 'Windows Installer', 'bin': 'Binary File',
          'dll': 'System Library', 'sys': 'System File', 'bat': 'Batch Script'
        };
        let folderName = extensionMap[ext];

        if (!folderName) {
          if (ext === '' && basename !== '') {
            folderName = 'System or Config File';
          } else {
            folderName = 'Other';
          }
        }

        pathParts.push(folderName);
        break;
      case 'byKeyword':
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
        break;
      case 'byCustomPath':
        const customPaths = result.customPaths || {};
        const domainPath = customPaths[domain];
        const globalPath = result.globalPath;
        if (domainPath && domainPath.trim() !== '') {
          pathParts.push(sanitizePath(domainPath));
        } else if (!isSiteSpecificMode && globalPath && globalPath.trim() !== '') {
          pathParts.push(sanitizePath(globalPath));
        }
        break;
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
      try { domain = new URL(targetUrl).hostname.replace(/^www\./, ''); } catch (e) { }

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