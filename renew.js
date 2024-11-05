// This function will be called from popup.js when the user clicks "Start Renew"
async function renewAllItems() {
    // Select all elements that have the renew function in their 'onclick' attribute
    const items = document.querySelectorAll('a[onclick^="renew("]');

    for (let item of items) {
        // Extract the item ID from the onclick attribute
        const itemId = item.getAttribute('onclick').match(/\d+/)[0];

        try {
            // Send the renew request
            const response = await fetch(`https://www.list.am/ad-renew?i=${itemId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    // Add any other necessary headers here
                },
                body: 'q=&c=-1&_t=&_form_action=&form0_form_visited=1' // Based on HAR data
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
}
