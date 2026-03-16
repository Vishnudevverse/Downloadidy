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

    groupList.appendChild(listItem);
  }
}

chrome.storage.sync.get('groups', (data) => {
  if (data.groups) {
    renderGroups(data.groups);
  }
});
