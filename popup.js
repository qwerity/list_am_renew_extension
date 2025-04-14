// Load saved delay value when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['delayValue'], (result) => {
    if (result.delayValue) {
      document.getElementById('delay').value = result.delayValue;
    }
  });
});

// Function to show notifications directly from popup
function showNotification(title, message) {
  console.log("Showing notification:", title, message);
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: title,
    message: message
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error("Notification error:", chrome.runtime.lastError);
    } else {
      console.log("Notification shown with ID:", notificationId);
    }
  });
}

document.getElementById('startRenew').addEventListener('click', () => {
  const delay = parseInt(document.getElementById('delay').value);
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = "Starting renew process...";
  
  // Save the delay value for next time
  chrome.storage.local.set({delayValue: delay});

  // Show notification that process is starting
  showNotification("Process Started", "Renew process has started");

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
      showNotification("Error", "Failed to inject script: " + err.message);
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
    showNotification("Complete", "Renew process completed successfully!");
    
    // Reload the current tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.reload(tabs[0].id, {bypassCache: true});
    });
  } else if (request.message === "error") {
    const errorMsg = request.error || "Unknown error";
    document.getElementById('status').textContent = "Error: " + errorMsg;
    showNotification("Error", "Process error: " + errorMsg);
  }
});
