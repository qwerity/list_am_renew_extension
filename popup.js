document.getElementById('startRenew').addEventListener('click', () => {
  const delay = parseInt(document.getElementById('delay').value);
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = "Starting renew process...";

  // Execute the renew function in the current tab
  chrome.tabs.executeScript({
      code: `
          const delay = ${delay};
          renewAllItems().then(() => {
              chrome.runtime.sendMessage({message: "done"});
          });
      `
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "done") {
      document.getElementById('status').textContent = "Renew process completed!";
      
      // Show system notification
      chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Renew Process Complete",
          message: "All items have been renewed successfully!"
      });

    browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        browser.tabs.reload(tabs[0].id, {bypassCache: true});
    });
  }
});
