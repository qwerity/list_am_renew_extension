// This function will be called from popup.js when the user clicks "Start Renew"
async function renewAllItems(delay) {
    // Get the default delay from storage if not provided
    if (delay === undefined || delay === null) {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.local.get(['delayValue'], resolve);
            });
            delay = result.delayValue || 10; // Default to 10ms if no stored value
        } catch (error) {
            console.error("Error retrieving delay value:", error);
            delay = 10; // Default to 10ms if error
        }
    }
    
    console.log(`Starting renewal process with ${delay}ms delay between items`);
    
    // Select all elements that have the renew function in their 'onclick' attribute
    const items = document.querySelectorAll('a[onclick^="renew("]');
    console.log(`Found ${items.length} items to renew`);

    if (items.length === 0) {
        console.log("No items found to renew");
        return Promise.resolve(); // Resolve immediately if no items
    }

    for (let item of items) {
        // Extract the item ID from the onclick attribute
        const itemId = item.getAttribute('onclick').match(/\d+/)[0];

        try {
            // Send the renew request
            const response = await fetch(`https://www.list.am/ad-renew?i=${itemId}`, {
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
                body: "open_to_price_negotiation=1&repeat=0&payment_method=0&use_max_renew_count=&_form_action=&form0_form_visited=1",
                mode: "cors",
            });

            if (response.ok) {
                console.log(`Renewed item ${itemId} successfully.`);
            } else {
                console.error(`Failed to renew item ${itemId}. Status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error renewing item ${itemId}:`, error);
        }

        // Wait for the specified delay before moving to the next item
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.log("Renewal process completed for all items");
    return Promise.resolve(); // Explicitly resolve the promise
}
