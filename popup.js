document.getElementById('startRenew').addEventListener('click', () => {
  const delay = parseInt(document.getElementById('delay').value);
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = "Starting renew process...";

  // Execute the renew function in the current tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: injectRenewProcess,
      args: [delay]
    });
  });
});

// Function to be injected into the tab
function injectRenewProcess(delay) {
  // The delay value is passed from the popup
  if (typeof renewAllItems === 'function') {
    renewAllItems(delay).then(() => {
      chrome.runtime.sendMessage({message: "done"});
    });
  } else {
    console.error('renewAllItems function not found');
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "done") {
    document.getElementById('status').textContent = "Renew process completed!";
    
    // Reload the current tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.reload(tabs[0].id, {bypassCache: true});
    });
  }
});
