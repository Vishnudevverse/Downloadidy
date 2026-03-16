const groupList = document.getElementById('group-list');

function renderGroups(groups) {
  groupList.innerHTML = '';
  for (const groupName in groups) {
    const group = groups[groupName];
    const listItem = document.createElement('li');
    
    const groupNameSpan = document.createElement('span');
    groupNameSpan.textContent = `${groupName} (${group.urls.length})`;
    listItem.appendChild(groupNameSpan);

    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download';
    downloadButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'downloadGroup',
        groupName: groupName
      });
    });
    listItem.appendChild(downloadButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'deleteGroup',
        groupName: groupName
      });
    });
    listItem.appendChild(deleteButton);

    groupList.appendChild(listItem);
  }
}

chrome.storage.sync.get('groups', (data) => {
  if (data.groups) {
    renderGroups(data.groups);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'groupDeleted') {
    chrome.storage.sync.get('groups', (data) => {
      if (data.groups) {
        renderGroups(data.groups);
      } else {
        groupList.innerHTML = '';
      }
    });
  }
});
