// DyslexiForm Background Service Worker (Manifest V3)

const DEFAULT_SETTINGS = {
  enabled: true,
  fontFamily: 'Lexend',
  fontSize: 105,       // %
  lineHeight: 1.75,    // multiplier
  letterSpacing: 0.04, // em
  wordSpacing: 0.12,   // em
  paragraphSpacing: 1.4, // em
  bionicMode: false,
  readingRuler: false,
  rulerHeight: 36,     // px
  rulerOpacity: 35,    // %
  pageTint: 'none',    // 'none', 'cream', 'peach', 'mint', 'rose', 'dark'
  fontWeightBoost: false
};

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.sync.get(['dyslexiform_settings'], (result) => {
    if (!result.dyslexiform_settings) {
      chrome.storage.sync.set({ dyslexiform_settings: DEFAULT_SETTINGS }, () => {
        console.log('[DyslexiForm] Initialized default accessibility settings.');
      });
    }
  });
  updateBadge(true);
});

function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#1a6b5a' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#888888' });
  }
}

// Listen to storage changes to update badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.dyslexiform_settings) {
    const val = changes.dyslexiform_settings.newValue;
    if (val) {
      updateBadge(val.enabled);
    }
  }
});
