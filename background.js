chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  
  // Request notification permission if not already granted
  if (chrome.notifications && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
});

// Helper function to create notifications with fallback
function createNotification(options) {
  console.log("Creating notification:", options);
  
  try {
    // Try Chrome's notification API first
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: options.title,
      message: options.message,
      priority: 2
    }, (notificationId) => {
      console.log("Notification created with ID:", notificationId);
      // If there's an error, this callback might not run
      if (chrome.runtime.lastError) {
        console.error("Chrome notification error:", chrome.runtime.lastError);
        fallbackNotification(options);
      }
    });
  } catch (error) {
    console.error("Error creating Chrome notification:", error);
    fallbackNotification(options);
  }
}

// Fallback to Web Notification API if Chrome's API fails
function fallbackNotification(options) {
  console.log("Attempting fallback notification");
  
  // Check if Web Notifications are supported and permission is granted
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(options.title, {
      body: options.message,
      icon: "icon.png"
    });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(options.title, {
          body: options.message,
          icon: "icon.png"
        });
      }
    });
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message in background script:", request);
  
  // Forward messages between popup and content scripts
  if (request.message === "done") {
    // Handle completion message
    createNotification({
      title: "Renew Process Complete",
      message: "All items have been renewed successfully!"
    });
    
    // Forward the message to the popup if it's not already from there
    if (sender.tab) {
      console.log("Forwarding completion message to popup");
      chrome.runtime.sendMessage({message: "done"});
    }
  } else if (request.message === "error") {
    // Handle error message
    createNotification({
      title: "Renew Process Error",
      message: request.error || "An unknown error occurred"
    });
    
    // Forward the error to the popup if it's not already from there
    if (sender.tab) {
      console.log("Forwarding error message to popup");
      chrome.runtime.sendMessage({message: "error", error: request.error});
    }
  }
  
  return true; // Keep the message channel open for async responses
});