// DyslexiForm Content Script — Real-Time Typographic Accessibility
(function () {
  'use strict';

  let currentSettings = null;
  let rulerEl = null;
  let tintEl = null;
  let bionicOriginalMap = new WeakMap();
  let bionicProcessedNodes = new WeakSet();
  let isBionicActive = false;
  let mouseMoveBound = false;

  function initElements() {
    if (!rulerEl) {
      rulerEl = document.createElement('div');
      rulerEl.id = 'dyslexiform-reading-ruler';
      rulerEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(rulerEl);
    }
    if (!tintEl) {
      tintEl = document.createElement('div');
      tintEl.id = 'dyslexiform-tint-overlay';
      tintEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tintEl);
    }
  }

  function handleMouseMove(e) {
    if (!rulerEl || !currentSettings || !currentSettings.enabled || !currentSettings.readingRuler) return;
    rulerEl.style.top = e.clientY + 'px';
  }

  function applySettings(settings) {
    if (!settings) return;
    currentSettings = settings;
    initElements();

    const root = document.documentElement;

    if (!settings.enabled) {
      root.removeAttribute('data-dyslexiform-active');
      root.removeAttribute('data-dyslexiform-font');
      root.removeAttribute('data-dyslexiform-boost');
      if (rulerEl) rulerEl.style.display = 'none';
      if (tintEl) {
        tintEl.className = '';
        tintEl.style.display = 'none';
      }
      if (isBionicActive) removeBionicReading();
      return;
    }

    root.setAttribute('data-dyslexiform-active', 'true');
    root.setAttribute('data-dyslexiform-font', settings.fontFamily || 'Lexend');
    root.setAttribute('data-dyslexiform-boost', settings.fontWeightBoost ? 'true' : 'false');

    // CSS custom properties
    root.style.setProperty('--df-letter-spacing', (settings.letterSpacing || 0.04) + 'em');
    root.style.setProperty('--df-word-spacing', (settings.wordSpacing || 0.12) + 'em');
    root.style.setProperty('--df-line-height', String(settings.lineHeight || 1.75));
    root.style.setProperty('--df-paragraph-spacing', (settings.paragraphSpacing || 1.4) + 'em');
    
    // Font scale
    const scale = (settings.fontSize || 100) / 100;
    root.style.setProperty('--df-font-scale', String(scale));

    // Reading Ruler
    if (settings.readingRuler) {
      rulerEl.style.display = 'block';
      rulerEl.style.height = (settings.rulerHeight || 36) + 'px';
      const dimOpacity = ((settings.rulerOpacity || 35) / 100) * 0.7;
      rulerEl.style.setProperty('--df-ruler-dim', String(dimOpacity));

      if (!mouseMoveBound) {
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        mouseMoveBound = true;
      }
    } else {
      if (rulerEl) rulerEl.style.display = 'none';
    }

    // Page Tint Overlay
    if (tintEl) {
      tintEl.className = '';
      if (settings.pageTint && settings.pageTint !== 'none') {
        tintEl.className = 'tint-' + settings.pageTint;
      } else {
        tintEl.style.display = 'none';
      }
    }

    // Bionic Reading
    if (settings.bionicMode) {
      if (!isBionicActive) applyBionicReading();
    } else {
      if (isBionicActive) removeBionicReading();
    }
  }

  // Bionic reading processor: highlights initial fixation point in every word
  function applyBionicReading() {
    isBionicActive = true;
    const candidates = document.querySelectorAll('p, article p, section p, .article-body p, li, blockquote');

    candidates.forEach((el) => {
      if (el.closest('#dyslexiform-reading-ruler') || el.closest('#dyslexiform-tint-overlay')) return;
      if (bionicProcessedNodes.has(el)) return;

      bionicOriginalMap.set(el, el.innerHTML);

      // Walk text nodes
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.trim().length > 0) {
          textNodes.push(node);
        }
      }

      textNodes.forEach((tNode) => {
        const text = tNode.nodeValue;
        const words = text.split(/(\s+)/);
        const frag = document.createDocumentFragment();

        words.forEach((part) => {
          if (!part || /^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            const word = part;
            // Half length rounded up
            const mid = Math.ceil(word.length * 0.45);
            const lead = word.slice(0, mid);
            const tail = word.slice(mid);

            const spanLead = document.createElement('span');
            spanLead.className = 'dyslexiform-bionic-lead';
            spanLead.textContent = lead;

            const spanTail = document.createElement('span');
            spanTail.className = 'dyslexiform-bionic-tail';
            spanTail.textContent = tail;

            frag.appendChild(spanLead);
            if (tail) frag.appendChild(spanTail);
          }
        });

        if (tNode.parentNode) {
          tNode.parentNode.replaceChild(frag, tNode);
        }
      });

      bionicProcessedNodes.add(el);
    });
  }

  function removeBionicReading() {
    isBionicActive = false;
    const candidates = document.querySelectorAll('p, article p, section p, .article-body p, li, blockquote');
    candidates.forEach((el) => {
      if (bionicOriginalMap.has(el)) {
        el.innerHTML = bionicOriginalMap.get(el);
        bionicProcessedNodes.delete(el);
      }
    });
  }

  // Load stored settings on initial injection
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['dyslexiform_settings'], (result) => {
      if (result && result.dyslexiform_settings) {
        applySettings(result.dyslexiform_settings);
      }
    });

    // Listen for direct updates from popup in real-time
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'DYSLEXIFORM_UPDATE_SETTINGS') {
        applySettings(message.settings);
        sendResponse({ success: true });
      } else if (message.type === 'DYSLEXIFORM_GET_STATUS') {
        sendResponse({ status: 'ACTIVE', settings: currentSettings });
      }
    });
  }
})();
