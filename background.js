chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Forward messages between popup and content scripts
  if (request.message === "done") {
    // Handle completion message
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Renew Process Complete",
      message: "All items have been renewed successfully!"
    });
  } else if (request.message === "error") {
    // Handle error message
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Renew Process Error",
      message: request.error || "An unknown error occurred"
    });
  }
  
  return true; // Keep the message channel open for async responses
});