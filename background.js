chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-group",
    title: "Add to Downloadidy Group",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-group") {
    const groupName = prompt("Enter group name:");
    if (groupName) {
      chrome.storage.sync.get('groups', (data) => {
        const groups = data.groups || {};
        if (!groups[groupName]) {
          groups[groupName] = { urls: [] };
        }
        groups[groupName].urls.push(info.linkUrl);
        chrome.storage.sync.set({ groups });
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadGroup') {
    chrome.storage.sync.get('groups', (data) => {
      const group = data.groups[request.groupName];
      if (group) {
        for (const url of group.urls) {
          chrome.downloads.download({ url });
        }
      }
    });
  } else if (request.action === 'deleteGroup') {
    chrome.storage.sync.get('groups', (data) => {
      const groups = data.groups;
      if (groups && groups[request.groupName]) {
        delete groups[request.groupName];
        chrome.storage.sync.set({ groups }, () => {
          chrome.runtime.sendMessage({ action: 'groupDeleted' });
        });
      }
    });
  }
});
