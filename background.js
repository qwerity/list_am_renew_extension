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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { // Make this async
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
      // Check if a popup is open before sending a message to it
      chrome.runtime.sendMessage(request, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Popup is not open. Message not sent.");
        } else {
          console.log("Message sent to popup successfully.");
        }
      });
    }
  } else if (request.message === "error") {
    // Handle error message
    createNotification({
      title: "Process Error",
      message: request.error || "An unknown error occurred"
    });

    // Forward the error to the popup if it's not already from there
    if (sender.tab) {
      chrome.runtime.sendMessage({message: "error", error: request.error}, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Popup is not open. Error message not sent.");
        }
      });
    }
  } else if (request.action === 'republishItem') {
    // Handle the fetch request from the content script
    (async () => {
      try {
        const response = await fetch(`https://www.list.am/rtaq?type=5&post_id=${request.itemId}&_rtt=1`, {
          method: 'POST',
          headers: {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9,hy;q=0.8,ru;q=0.7",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "priority": "u=1, i",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest"
          },
          body: "payment_method=3&_form_action=&form0_form_visited=1",
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log(`Republished item ${request.itemId} successfully via background.`);
        sendResponse({ success: true });
      } catch (error) {
        console.error(`Background fetch error for item ${request.itemId}:`, error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Indicates that the response is sent asynchronously
  }

  return true; // Keep the message channel open for async responses
});