// content.js

let styleElement = null;
let fontLinkElement = null;

function applyFont(fontName, enabled, excludedSites) {
    const domain = window.location.hostname;
    const isExcluded = excludedSites.includes(domain);

    // Remove existing if any
    if (styleElement) styleElement.remove();
    if (fontLinkElement) fontLinkElement.remove();

    if (enabled && !isExcluded && fontName) {
        // Create link tag for Google Font
        fontLinkElement = document.createElement('link');
        fontLinkElement.rel = 'stylesheet';
        fontLinkElement.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
        document.head.appendChild(fontLinkElement);

        // Create style tag to override
        // Stable version: Targets major text containers while avoiding common icon prefixes
        styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Apply to standard text tags */
            body, p, h1, h2, h3, h4, h5, h6, a, li, label, input, textarea, button, strong, em, b {
                font-family: '${fontName}', sans-serif !important;
            }

            /* Apply to generic containers only if they don't look like icons */
            div:not([class*="icon"]):not([class*="material"]):not([class*="fa"]):not([class*="goog"]):not([class*="symb"]):not([class*="bi"]):not([class*="glyph"]),
            span:not([class*="icon"]):not([class*="material"]):not([class*="fa"]):not([class*="goog"]):not([class*="symb"]):not([class*="bi"]):not([class*="glyph"]) {
                font-family: '${fontName}', sans-serif !important;
            }
        `;
        document.documentElement.appendChild(styleElement);
    }
}

// Initial load
chrome.storage.sync.get({
    enabled: true,
    selectedFont: 'Roboto',
    excludedSites: []
}, (data) => {
    applyFont(data.selectedFont, data.enabled, data.excludedSites);
});

// Listen for changes
chrome.storage.onChanged.addListener((changes) => {
    chrome.storage.sync.get({
        enabled: true,
        selectedFont: 'Roboto',
        excludedSites: []
    }, (data) => {
        applyFont(data.selectedFont, data.enabled, data.excludedSites);
    });
});
