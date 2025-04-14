const STATE_KEY = 'list_am_renewal_state';

function initState() {
  const renewElements = document.querySelectorAll('a[onclick*="renew"]');
  return {
    isRunning: true,
    currentIndex: 0,
    totalItems: renewElements.length,
    totalProcessed: 0,
    totalFailed: 0,
    lastUpdate: Date.now()
  };
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  // Notify popup about state change
  chrome.runtime.sendMessage({
    type: 'stateUpdate',
    state: state,
    status: `Processing item ${state.currentIndex + 1}/${state.totalItems}`
  });
}

function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  return saved ? JSON.parse(saved) : null;
}

function clearState() {
  localStorage.removeItem(STATE_KEY);
  chrome.runtime.sendMessage({
    type: 'stateUpdate',
    state: null,
    status: 'Process stopped'
  });
}

// Get the delay value from storage
async function getDelay() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['delayValue'], resolve);
    });
    return result.delayValue || 1000; // Default to 1000ms if no stored value
  } catch (error) {
    console.error("Error retrieving delay value:", error);
    return 1000; // Default to 1000ms if error
  }
}

async function processCurrentItem() {
  let state = loadState();
  
  if (!state) {
    return;
  }

  const renewElements = document.querySelectorAll('a[onclick*="renew"]');
  
  if (state.currentIndex >= renewElements.length) {
    chrome.runtime.sendMessage({
      type: 'stateUpdate',
      state: state,
      status: 'All items processed!'
    });
    clearState();
    return;
  }

  try {
    renewElements[state.currentIndex].click();
    
    // Use the configurable delay
    const processingDelay = await getDelay();
    await new Promise(resolve => setTimeout(resolve, processingDelay));
    
    const submitButton = document.querySelector('#submit_dlg_button');
    if (submitButton) {
      state.currentIndex++;
      state.totalProcessed++;
      state.lastUpdate = Date.now();
      saveState(state);
      submitButton.click();
    } else {
      throw new Error('Submit button not found');
    }
  } catch (error) {
    console.error('Error:', error);
    state.totalFailed++;
    state.currentIndex++;
    saveState(state);
    window.location.reload();
  }
}

function startProcess() {
  const state = initState();
  saveState(state);
  processCurrentItem();
}

function stopProcess() {
  clearState();
}

// Listen for commands from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'start':
      startProcess();
      break;
    case 'stop':
      stopProcess();
      break;
    case 'getState':
      const state = loadState();
      chrome.runtime.sendMessage({
        type: 'stateUpdate',
        state: state,
        status: state ? `Processing item ${state.currentIndex + 1}/${state.totalItems}` : 'Ready'
      });
      break;
  }
  return true; // Keep the message channel open for async responses
});

// Check and continue on page load
document.addEventListener('DOMContentLoaded', () => {
  const state = loadState();
  if (state && state.isRunning) {
    if (Date.now() - state.lastUpdate > 300000) {
      clearState();
    } else {
      processCurrentItem();
    }
  }
});