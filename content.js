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
  browser.runtime.sendMessage({
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
  browser.runtime.sendMessage({
    type: 'stateUpdate',
    state: null,
    status: 'Process stopped'
  });
}

async function processCurrentItem() {
  let state = loadState();
  
  if (!state) {
    return;
  }

  const renewElements = document.querySelectorAll('a[onclick*="renew"]');
  
  if (state.currentIndex >= renewElements.length) {
    browser.runtime.sendMessage({
      type: 'stateUpdate',
      state: state,
      status: 'All items processed!'
    });
    clearState();
    return;
  }

  try {
    renewElements[state.currentIndex].click();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'start':
      startProcess();
      break;
    case 'stop':
      stopProcess();
      break;
    case 'getState':
      const state = loadState();
      browser.runtime.sendMessage({
        type: 'stateUpdate',
        state: state,
        status: state ? `Processing item ${state.currentIndex + 1}/${state.totalItems}` : 'Ready'
      });
      break;
  }
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