// Load saved delay value when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['delayValue'], (result) => {
    if (result.delayValue) {
      document.getElementById('delay').value = result.delayValue;
    }
  });
});

document.getElementById('startRenew').addEventListener('click', () => {
  const delay = parseInt(document.getElementById('delay').value);
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = "Starting renew process...";
  
  // Save the delay value for next time
  chrome.storage.local.set({delayValue: delay});

  // Execute the renew function in the current tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // First, inject the renewAllItems function
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      files: ['renew.js']
    }).then(() => {
      // Then execute the function with our delay parameter
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: injectRenewProcess,
        args: [delay]
      });
    }).catch(err => {
      console.error("Error injecting script:", err);
      statusDiv.textContent = "Error: " + err.message;
    });
  });
});

// Function to be injected into the tab
function injectRenewProcess(delay) {
  // Check if renewAllItems is available now
  if (typeof renewAllItems === 'function') {
    renewAllItems(delay).then(() => {
      chrome.runtime.sendMessage({message: "done"});
    }).catch(err => {
      console.error("Error in renewAllItems:", err);
      chrome.runtime.sendMessage({message: "error", error: err.message});
    });
  } else {
    console.error('renewAllItems function not found');
    chrome.runtime.sendMessage({message: "error", error: "renewAllItems function not found"});
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
  } else if (request.message === "error") {
    document.getElementById('status').textContent = "Error: " + (request.error || "Unknown error");
  }
});
