// Load saved delay value and price negotiation when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['delayValue', 'priceNegotiation'], (result) => {
    if (result.delayValue) {
      document.getElementById('delay').value = result.delayValue;
    }
    document.getElementById('priceNegotiation').checked = !!result.priceNegotiation;
  });

  // Save price negotiation setting on change
  document.getElementById('priceNegotiation').addEventListener('change', (e) => {
    chrome.storage.local.set({ priceNegotiation: e.target.checked });
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

// Function to reload the current tab
function reloadCurrentTab() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0] && tabs[0].id) {
      console.log("Reloading tab with ID:", tabs[0].id);
      chrome.tabs.reload(tabs[0].id, {bypassCache: true}, () => {
        if (chrome.runtime.lastError) {
          console.error("Error reloading tab:", chrome.runtime.lastError);
          // Try again after a short delay
          setTimeout(() => {
            chrome.tabs.reload(tabs[0].id, {bypassCache: true});
          }, 1000);
        }
      });
    } else {
      console.error("Could not find active tab to reload");
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
      console.log("Renew process completed, sending done message");
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
  console.log("Received message in popup:", request);
  
  if (request.message === "done") {
    document.getElementById('status').textContent = "Renew process completed!";
    showNotification("Complete", "Renew process completed successfully!");
    
    // Reload the current tab with improved mechanism
    console.log("Attempting to reload page after completion");
    reloadCurrentTab();
  } else if (request.message === "error") {
    const errorMsg = request.error || "Unknown error";
    document.getElementById('status').textContent = "Error: " + errorMsg;
    showNotification("Error", "Process error: " + errorMsg);
  }
  
  return true; // Keep the message channel open
});

document.getElementById('rePublish').addEventListener('click', () => {
  const delay = parseInt(document.getElementById('delay').value) || 10;
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = "Starting republish process...";
  showNotification("Process Started", "RePublish process has started");

  chrome.storage.local.set({delayValue: delay}); // Save delay for consistency

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: republishAllItemsInjected,
      args: [delay]
    });
  });
});

// Function to be injected into the tab for republishing
function republishAllItemsInjected(delay) {
  // Select all elements that have the republish class and an onclick attribute containing /rtao?type=5&post_id
  const items = Array.from(document.querySelectorAll('a.ad-action-wrapper.republish[onclick*="/rtao?type=5"]'));
  console.log(`Found ${items.length} items to republish`);

  async function republishItem(itemId) {
    try {
      await fetch(`https://www.list.am/rtao?type=5&post_id=${itemId}&_rtt=1`, {
        method: 'POST',
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9,hy;q=0.8,ru;q=0.7",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "priority": "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-gpc": "1",
          "x-requested-with": "XMLHttpRequest"
        },
        body: "payment_method=&_form_action=&form0_form_visited=1",
        mode: "cors",
        credentials: "include"
      });
      console.log(`Republished item ${itemId} successfully.`);
    } catch (error) {
      console.error(`Error republishing item ${itemId}:`, error);
    }
  }

  (async () => {
    for (let item of items) {
      // Extract post_id from the onclick attribute
      const onclick = item.getAttribute('onclick');
      const match = onclick.match(/post_id=(\d+)/);
      if (!match) {
        console.warn('No post_id found in republish button:', onclick);
        continue;
      }
      const itemId = match[1];
      await republishItem(itemId);
      await new Promise(resolve => setTimeout(resolve, delay)); // Use the same delay as renew
    }
    console.log("Republish process completed for all items");
    chrome.runtime.sendMessage({message: "done"});
    window.location.reload(); // Refresh the page after all items are republished
  })();
}
