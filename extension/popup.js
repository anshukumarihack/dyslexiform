// DyslexiForm Popup Logic

const DEFAULT_SETTINGS = {
  enabled: true,
  fontFamily: 'Lexend',
  fontSize: 105,
  lineHeight: 1.75,
  letterSpacing: 0.04,
  wordSpacing: 0.12,
  paragraphSpacing: 1.4,
  bionicMode: false,
  readingRuler: false,
  rulerHeight: 36,
  rulerOpacity: 35,
  pageTint: 'none',
  fontWeightBoost: false
};

let settings = { ...DEFAULT_SETTINGS };

// DOM Elements
const masterToggle = document.getElementById('masterToggle');
const mainControls = document.getElementById('mainControls');
const statusBadge = document.getElementById('statusBadge');

const inputFontSize = document.getElementById('input-fontSize');
const valFontSize = document.getElementById('val-fontSize');
const inputLineHeight = document.getElementById('input-lineHeight');
const valLineHeight = document.getElementById('val-lineHeight');
const inputLetterSpacing = document.getElementById('input-letterSpacing');
const valLetterSpacing = document.getElementById('val-letterSpacing');
const inputWordSpacing = document.getElementById('input-wordSpacing');
const valWordSpacing = document.getElementById('val-wordSpacing');

const toggleBionic = document.getElementById('toggle-bionic');
const toggleRuler = document.getElementById('toggle-ruler');
const toggleWeight = document.getElementById('toggle-weight');

const fontButtons = document.querySelectorAll('.font-btn');
const tintButtons = document.querySelectorAll('.tint-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['dyslexiform_settings'], (result) => {
      if (result && result.dyslexiform_settings) {
        settings = Object.assign({}, DEFAULT_SETTINGS, result.dyslexiform_settings);
      }
      syncUIToSettings();
    });
  } else {
    syncUIToSettings();
  }

  setupEventListeners();
});

function syncUIToSettings() {
  masterToggle.checked = settings.enabled;
  if (!settings.enabled) {
    mainControls.classList.add('disabled');
    statusBadge.textContent = 'Disabled';
    statusBadge.style.color = '#888';
    statusBadge.style.background = '#eee';
  } else {
    mainControls.classList.remove('disabled');
    statusBadge.textContent = 'Active';
    statusBadge.style.color = '#1a6b5a';
    statusBadge.style.background = 'rgba(26,107,90,0.15)';
  }

  // Typeface
  fontButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.font === settings.fontFamily);
  });

  // Sliders
  inputFontSize.value = settings.fontSize;
  valFontSize.textContent = settings.fontSize + '%';

  inputLineHeight.value = settings.lineHeight;
  valLineHeight.textContent = settings.lineHeight;

  inputLetterSpacing.value = settings.letterSpacing;
  valLetterSpacing.textContent = settings.letterSpacing + 'em';

  inputWordSpacing.value = settings.wordSpacing;
  valWordSpacing.textContent = settings.wordSpacing + 'em';

  // Toggles
  toggleBionic.checked = Boolean(settings.bionicMode);
  toggleRuler.checked = Boolean(settings.readingRuler);
  toggleWeight.checked = Boolean(settings.fontWeightBoost);

  // Tint
  tintButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tint === (settings.pageTint || 'none'));
  });
}

function persistAndBroadcast() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ dyslexiform_settings: settings });

    // Send to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'DYSLEXIFORM_UPDATE_SETTINGS',
          settings: settings
        }, () => {
          if (chrome.runtime.lastError) {
            // Tab might not be an accessible page like chrome://
          }
        });
      }
    });
  }
}

function setupEventListeners() {
  masterToggle.addEventListener('change', (e) => {
    settings.enabled = e.target.checked;
    syncUIToSettings();
    persistAndBroadcast();
  });

  // Fonts
  fontButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.fontFamily = btn.dataset.font;
      syncUIToSettings();
      persistAndBroadcast();
    });
  });

  // Sliders
  inputFontSize.addEventListener('input', (e) => {
    settings.fontSize = parseInt(e.target.value, 10);
    valFontSize.textContent = settings.fontSize + '%';
    persistAndBroadcast();
  });

  inputLineHeight.addEventListener('input', (e) => {
    settings.lineHeight = parseFloat(e.target.value);
    valLineHeight.textContent = settings.lineHeight;
    persistAndBroadcast();
  });

  inputLetterSpacing.addEventListener('input', (e) => {
    settings.letterSpacing = parseFloat(e.target.value);
    valLetterSpacing.textContent = settings.letterSpacing + 'em';
    persistAndBroadcast();
  });

  inputWordSpacing.addEventListener('input', (e) => {
    settings.wordSpacing = parseFloat(e.target.value);
    valWordSpacing.textContent = settings.wordSpacing + 'em';
    persistAndBroadcast();
  });

  // Toggles
  toggleBionic.addEventListener('change', (e) => {
    settings.bionicMode = e.target.checked;
    persistAndBroadcast();
  });

  toggleRuler.addEventListener('change', (e) => {
    settings.readingRuler = e.target.checked;
    persistAndBroadcast();
  });

  toggleWeight.addEventListener('change', (e) => {
    settings.fontWeightBoost = e.target.checked;
    persistAndBroadcast();
  });

  // Tints
  tintButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.pageTint = btn.dataset.tint;
      syncUIToSettings();
      persistAndBroadcast();
    });
  });

  // Presets
  document.getElementById('preset-gentle').addEventListener('click', () => {
    settings = {
      ...settings,
      fontFamily: 'Atkinson Hyperlegible',
      fontSize: 105,
      lineHeight: 1.85,
      letterSpacing: 0.05,
      wordSpacing: 0.14,
      pageTint: 'cream',
      bionicMode: false,
      readingRuler: false,
      fontWeightBoost: false
    };
    syncUIToSettings();
    persistAndBroadcast();
  });

  document.getElementById('preset-focus').addEventListener('click', () => {
    settings = {
      ...settings,
      fontFamily: 'OpenDyslexic',
      fontSize: 110,
      lineHeight: 1.9,
      letterSpacing: 0.06,
      wordSpacing: 0.16,
      pageTint: 'none',
      bionicMode: false,
      readingRuler: true,
      fontWeightBoost: true
    };
    syncUIToSettings();
    persistAndBroadcast();
  });

  document.getElementById('preset-speed').addEventListener('click', () => {
    settings = {
      ...settings,
      fontFamily: 'Lexend',
      fontSize: 105,
      lineHeight: 1.7,
      letterSpacing: 0.03,
      wordSpacing: 0.10,
      pageTint: 'none',
      bionicMode: true,
      readingRuler: true,
      fontWeightBoost: false
    };
    syncUIToSettings();
    persistAndBroadcast();
  });

  document.getElementById('preset-reset').addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    syncUIToSettings();
    persistAndBroadcast();
  });
}
