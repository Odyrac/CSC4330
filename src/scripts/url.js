/**
 * Cleans the URL by removing 'index.html' if present.
 */
function cleanURL() {
    // Get the current URL
    const url = window.location.href;
    // Remove 'index.html' from the URL if it exists
    const newURL = url.replace(/index\.html$/, '');
    // Update the browser's URL without reloading the page
    if (newURL !== url) {
        window.history.replaceState({}, document.title, newURL);
    }
}

cleanURL();