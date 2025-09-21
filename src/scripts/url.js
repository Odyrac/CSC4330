function cleanURL() {
    const url = window.location.href;
    const newURL = url.replace(/index\.html$/, '');

    if (newURL !== url) {
        window.history.replaceState({}, document.title, newURL);
    }
}

cleanURL();