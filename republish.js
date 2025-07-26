// This function will be called from popup.js when the user clicks "RePublish"
async function republishAllItems(delay) {
  // Select all 'a' elements with an onclick attribute that opens the republish dialog.
  const items = Array.from(document.querySelectorAll('a[onclick*="/rtaq?type=5"]'));
  console.log(`Found ${items.length} items to republish`);

  async function republishItem(itemId) {
    try {
      // Send a message to the background script to perform the fetch
      const response = await chrome.runtime.sendMessage({
        action: 'republishItem',
        itemId: itemId
      });

      if (!response || !response.success) {
        throw new Error(response.error || `Failed to republish item ${itemId}`);
      }
    } catch (error) {
      console.error(`Error republishing item ${itemId}:`, error);
      throw error; // Re-throw to allow caller to handle the error
    }
  }

  let successCount = 0;
  let errorCount = 0;

  for (let item of items) {
    const onclick = item.getAttribute('onclick');
    const match = onclick.match(/post_id=(\d+)/i);
    if (!match) {
      console.warn('No post_id found in republish button:', onclick);
      continue;
    }
    const itemId = match[1];

    try {
      await republishItem(itemId);
      successCount++;
    } catch (error) {
      console.error(`Failed to republish item ${itemId}:`, error);
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.log(`Republish process completed. Success: ${successCount}, Errors: ${errorCount}`);
  return { successCount, errorCount, total: items.length, process: 'RePublish' };
}