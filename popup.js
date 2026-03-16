const groupList = document.getElementById('group-list');

function renderGroups(groups) {
  groupList.innerHTML = '';
  for (const groupName in groups) {
    const group = groups[groupName];
    const listItem = document.createElement('li');
    listItem.textContent = `${groupName} (${group.urls.length})`;
    groupList.appendChild(listItem);
  }
}

chrome.storage.sync.get('groups', (data) => {
  if (data.groups) {
    renderGroups(data.groups);
  }
});
