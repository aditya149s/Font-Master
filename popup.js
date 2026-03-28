// popup.js

const FONTS = [
  'Inter', 'DM Sans', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Oswald', 'Raleway', 'Merriweather', 'Nunito', 'Playfair Display',
  'Rubik', 'Quicksand', 'Barlow', 'Fira Sans',
  'Source Sans Pro', 'Titillium Web', 'Heebo', 'Kanit', 'Ubuntu', 'Lora',
  'Josefin Sans', 'Exo 2', 'Cabin', 'Karla', 'Mulish', 'Work Sans',
  'Jost', 'Nanum Gothic', 'Pacifico', 'Dancing Script', 'Bebas Neue'
];

document.addEventListener('DOMContentLoaded', async () => {
  const masterToggle    = document.getElementById('masterToggle');
  const fontCarousel    = document.getElementById('fontCarousel');
  const customFontInput = document.getElementById('customFont');
  const excludeSiteBtn  = document.getElementById('excludeSite');
  const excludedZone    = document.getElementById('excludedZone');
  const emptyState      = document.getElementById('emptyState');
  const fabBtn          = document.getElementById('applyAll');
  const searchContainer = customFontInput.closest('.search-container');

  // ── Load saved settings ──
  const settings = await chrome.storage.sync.get({
    enabled: true,
    selectedFont: 'Inter',
    excludedSites: []
  });

  masterToggle.checked = settings.enabled;
  let activeFont = settings.selectedFont;

  // ── Build Font Carousel ──
  FONTS.forEach(font => {
    const item = document.createElement('div');
    item.className = 'font-item' + (font === activeFont ? ' selected' : '');
    item.textContent = font;
    item.style.fontFamily = `'${font}', sans-serif`;
    item.dataset.font = font;
    item.addEventListener('click', () => selectFont(font));
    fontCarousel.appendChild(item);
  });

  // Scroll selected item into view
  scrollToSelected();

  // ── FIX 1: Mouse Wheel scrolls the carousel horizontally ──
  fontCarousel.addEventListener('wheel', (e) => {
    e.preventDefault();
    // scroll up → go right, scroll down → go left (as requested)
    fontCarousel.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' });
  }, { passive: false });

  // ── Render excluded sites ──
  renderExclusionBubbles(settings.excludedSites);

  // ── Master Toggle ──
  masterToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: masterToggle.checked });
  });

  // ── FIX 2: Font autocomplete suggestions ──
  let suggestionBox = null;
  let activeSugIndex = -1;

  customFontInput.addEventListener('input', () => {
    const query = customFontInput.value.trim().toLowerCase();
    closeSuggestions();
    if (!query) return;

    const matches = FONTS.filter(f => f.toLowerCase().includes(query)).slice(0, 8);
    if (matches.length === 0) return;

    suggestionBox = document.createElement('div');
    suggestionBox.className = 'suggestions-list';
    activeSugIndex = -1;

    matches.forEach((font, idx) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';

      // Highlight matched substring
      const highlighted = font.replace(
        new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<em>$1</em>'
      );

      item.innerHTML = `
        <span class="sug-preview" style="font-family:'${font}',sans-serif">${font[0]}</span>
        <span>${highlighted}</span>
      `;

      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent input blur before click fires
        customFontInput.value = font;
        closeSuggestions();
        selectFont(font, true);
      });

      suggestionBox.appendChild(item);
    });

    searchContainer.appendChild(suggestionBox);
  });

  // Keyboard navigation in suggestions
  customFontInput.addEventListener('keydown', (e) => {
    if (!suggestionBox) {
      if (e.key === 'Enter') {
        const font = customFontInput.value.trim();
        if (font) selectFont(font, true);
      }
      return;
    }

    const items = suggestionBox.querySelectorAll('.suggestion-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeSugIndex = Math.min(activeSugIndex + 1, items.length - 1);
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeSugIndex = Math.max(activeSugIndex - 1, -1);
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSugIndex >= 0 && items[activeSugIndex]) {
        const font = FONTS.filter(f => f.toLowerCase().includes(customFontInput.value.trim().toLowerCase()))[activeSugIndex];
        if (font) { customFontInput.value = font; selectFont(font, true); }
      } else {
        const font = customFontInput.value.trim();
        if (font) selectFont(font, true);
      }
      closeSuggestions();
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });

  customFontInput.addEventListener('blur', () => {
    // Small delay so mousedown can fire first
    setTimeout(closeSuggestions, 150);
  });

  function updateActiveItem(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === activeSugIndex));
  }

  function closeSuggestions() {
    if (suggestionBox) { suggestionBox.remove(); suggestionBox = null; }
    activeSugIndex = -1;
  }

  // ── FAB: Apply to All Sites ──
  fabBtn.addEventListener('click', () => {
    const customVal = customFontInput.value.trim();
    const font = customVal || activeFont;
    if (!font) return;

    chrome.storage.sync.set({ selectedFont: font, enabled: true });
    masterToggle.checked = true;

    fabBtn.classList.add('success');
    const labelEl = fabBtn.querySelector('.fab-label');
    const original = labelEl.textContent;
    labelEl.textContent = 'APPLIED ✓';
    setTimeout(() => {
      fabBtn.classList.remove('success');
      labelEl.textContent = original;
    }, 1600);
  });

  // ── Exclude Current Site ──
  excludeSiteBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    try {
      const domain = new URL(tab.url).hostname;
      const data = await chrome.storage.sync.get({ excludedSites: [] });
      if (!data.excludedSites.includes(domain)) {
        const newList = [...data.excludedSites, domain];
        await chrome.storage.sync.set({ excludedSites: newList });
        renderExclusionBubbles(newList);
      }
    } catch (err) { console.error(err); }
  });

  // ── Helpers ──

  function selectFont(font, custom = false) {
    activeFont = font;
    chrome.storage.sync.set({ selectedFont: font });

    document.querySelectorAll('.font-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.font === font);
    });

    if (!custom) customFontInput.value = '';
    else closeSuggestions();
    scrollToSelected();
  }

  function scrollToSelected() {
    const selected = fontCarousel.querySelector('.font-item.selected');
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  function renderExclusionBubbles(sites) {
    Array.from(excludedZone.querySelectorAll('.bubble')).forEach(b => b.remove());

    if (sites.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    sites.forEach(site => {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      const favicon = document.createElement('img');
      favicon.className = 'favicon';
      favicon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${site}`;
      favicon.onerror = () => favicon.remove();

      const textEl = document.createElement('span');
      textEl.className = 'bubble-text';
      textEl.textContent = site;

      const xEl = document.createElement('span');
      xEl.className = 'bubble-x';
      xEl.textContent = '✕';

      bubble.appendChild(favicon);
      bubble.appendChild(textEl);
      bubble.appendChild(xEl);

      bubble.addEventListener('click', async () => {
        bubble.style.transform = 'scale(0)';
        bubble.style.opacity = '0';
        setTimeout(async () => {
          const data = await chrome.storage.sync.get({ excludedSites: [] });
          const newList = data.excludedSites.filter(s => s !== site);
          await chrome.storage.sync.set({ excludedSites: newList });
          renderExclusionBubbles(newList);
        }, 220);
      });

      excludedZone.appendChild(bubble);
    });
  }
});
