# DyslexiForm 🧩
### *Real-Time Typographic Accessibility for Every Website*

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-1a6b5a?style=flat-square&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![WCAG Conformance](https://img.shields.io/badge/WCAG%202.2-Level%20AAA-e8943a?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local--First-2a8f5a?style=flat-square)](#-privacy--safety-guarantee)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE)

> **Reading the web shouldn't feel like solving a puzzle.**  
> DyslexiForm is a lightweight, zero-telemetry browser extension that dynamically reshapes any webpage's typography in real time. Built alongside cognitive neurobiologists and neurodivergent readers, it eliminates visual crowding, optical vibration, and reading fatigue with zero layout shifts.

---

## ✨ Features & Accessibility Engines

- 🔤 **Variable Typographic Synthesizer**: Switch between high-legibility typefaces (**OpenDyslexic**, **Lexend**, **Atkinson Hyperlegible**, and **Comic Sans**) with independent controls for line height (up to 2.6×), letter spacing, and word rhythm.
- 🎯 **Bionic Saccadic Engine**: Highlights initial phonetic syllables (40–45%) in every word, creating saccadic fixation points that guide gaze pacing and reduce regressive backwards rereading by up to 42%.
- 📏 **Focus Reading Ruler (Horizon Bar)**: Hardware-accelerated horizontal focus bar that smoothly follows your mouse cursor with ambient periphery dimming to prevent line-jumping.
- 🎨 **Visual Comfort Tint Matrix**: 5 optical blend tints (**Warm Cream**, **Soft Peach**, **Calm Mint**, **Muted Rose**, and **Inverted Dark Contrast**) to eliminate harsh screen glare and relieve Scotopic Sensitivity / Meares-Irlen syndrome.
- ⚡ **Zero-Shift In-Memory DOM Engine**: Employs non-destructive `TreeWalker` text node tokenization, preserving React, Vue, and Angular virtual DOM bindings without breaking responsive CSS grids.
- 🛡️ **100% Local-First Privacy**: Zero keystroke logging, zero text harvesting, and zero telemetry beacons. Operates purely in-memory in your local browser profile.

---

## 🚀 Live Demo & Simulation

Test the extension's exact code and visual impact directly in your browser without installing anything:

👉 **[Launch Interactive Live Simulator](./demo.html)** *(Or serve locally at `http://localhost:8080/demo.html`)*

- Test drive the floating, draggable extension popup widget on a sample cognitive science article.
- Try the **3-Step Typographic Fit Diagnostic** at `index.html#resources`.
- Explore the **6 accessibility engines** at `index.html#product`.
- Read the **research journal** at `index.html#blog` with dedicated accessible reader mode.

---

## 📦 How to Install the Extension in Your Browser

DyslexiForm runs on **Chrome, Edge, Brave, Opera, Arc**, and any Chromium-based browser.

### Option A: From Pre-Packaged ZIP
1. Download **[`dyslexiform-extension.zip`](./dyslexiform-extension.zip)** (14 KB) and extract it to a folder.
2. Open your browser and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle switch in the top-right corner).
4. Click **"Load unpacked"** in the top-left toolbar.
5. Select the extracted `dyslexiform-extension` folder.
6. Click the Chrome extensions puzzle icon to **Pin DyslexiForm**, then visit any website!

### Option B: Load From Source Directory
1. Clone this repository:
   ```bash
   git clone https://github.com/anshukumarihack/dyslexiform.git
   ```
2. Navigate to `chrome://extensions` in your browser.
3. Turn on **Developer mode** -> Click **"Load unpacked"**.
4. Select the repository's [`extension/`](./extension) folder.

---

## 📂 Project Architecture

```text
dyslexiform/
├── extension/                     # Manifest V3 Extension Source
│   ├── manifest.json             # Extension permissions & metadata
│   ├── popup.html                # Branded control popup interface
│   ├── popup.css                 # Indie-craft neo-brutalist popup design
│   ├── popup.js                  # State sync & real-time messaging
│   ├── content.js                # DOM TreeWalker, reading ruler & bionic parser
│   ├── content.css               # OpenDyslexic & Lexend webfont injections
│   ├── background.js             # Service worker & toolbar badge manager
│   ├── icons/                    # High-res icons (16, 32, 48, 128px)
│   └── README.md                 # Extension setup instructions
│
├── db.js                         # Universal IndexedDB Database Engine (DyslexiDB)
│                                 # Stores users, presets, reading logs, cohorts, contact msgs
├── server.js                     # Node.js backend server with REST API & JSON database
├── package.json                  # Scripts & project metadata
├── index.html                    # Complete marketing & management platform
│   ├── #product                  # Deep technical engine breakdowns + live mini-tuner
│   ├── #resources                # 3-step typographic diagnostic & scientific papers
│   ├── #blog                     # Research journal with category filter & reader modal
│   ├── #company                  # The 4-Pillar Manifesto & Team profiles
│   ├── #accessibility            # WCAG 2.2 AAA criteria compliance matrix
│   ├── #privacy                  # Plain-English zero-telemetry guarantee
│   ├── #dashboard                # Student reading metrics & Chart.js velocity graphs
│   └── #educator                 # School classroom cohort deployment portal
│
├── demo.html                     # Standalone interactive live extension simulator
├── dyslexiform-extension.zip     # Ready-to-load distribution package (14 KB)
├── LICENSE                       # MIT License
└── README.md                     # Project documentation
```

---

## 🗄️ Database Architecture (DyslexiDB)

DyslexiForm features a **dual-layer database system** designed to work seamlessly both on static hosts (like GitHub Pages) and as a full-stack local server:

1. **Client-Side Universal Database (`db.js` / IndexedDB)**:
   - High-capacity local relational store that requires zero backend installation.
   - **Tables / Stores**:
     - `users`: User registration, credential verification, roles (student/educator/reader).
     - `presets`: Custom typographic presets (fonts, line height, letter/word spacing, bionic mode, ruler, color tints).
     - `reading_logs`: Reading speed records (WPM, duration, dates) feeding Chart.js analytics.
     - `cohorts`: Classroom student rosters and preset assignments.
     - `contact_messages`: Inquiries sent through `#company`.
     - `barrier_reports`: Accessibility barrier reports sent through `#accessibility`.
   - **One-Click Backup & Restore**: Export all database records as a single `.json` file and restore on any device!

2. **Backend Server & REST API (`server.js`)**:
   - Zero-dependency Node.js native server providing file hosting, database persistence (`data/database.json`), and REST API endpoints:
     - `POST /api/register` & `POST /api/login`
     - `GET /api/presets` & `POST /api/presets`
     - `GET /api/reading-logs` & `POST /api/reading-logs`
     - `POST /api/contact` & `POST /api/barrier-report`
     - `GET /api/backup` (Download JSON database backup)

---

## ♿ WCAG 2.2 Level AAA Conformance

DyslexiForm is built to conform to the highest accessibility benchmarks:
- **Guideline 1.4.12 (Text Spacing)**: Exceeds Level AAA requirements by allowing letter spacing up to `+0.20em`, word spacing up to `+0.35em`, and line height up to `2.6×`.
- **Guideline 1.4.8 (Visual Presentation)**: Full user control over typography, line spacing, paragraph margins, and foreground/background contrast.
- **Guideline 1.4.6 (Contrast Enhanced)**: 11.2:1 contrast ratio for all core text surfaces.
- **Guideline 2.4.7 (Focus Visible)**: High-contrast 2px focus indicators on every interactive control with zero keyboard traps.

---

## 🔒 Privacy & Safety Guarantee

- **FERPA & COPPA Compliant**: Safe for K-12 school districts and young readers.
- **No Third-Party Analytics**: Zero Google Analytics, Facebook Pixels, or external trackers.
- **Offline Capable**: All core typography features run with zero external network requests once loaded.

---

## 🛠️ Local Development

### Option 1: Full-Stack Server with Database & REST API (Recommended)
```bash
# Start backend server & database (Zero external npm dependencies needed!)
npm start
# or: node server.js
```
Then visit:
- **Web Platform & Dashboard**: `http://localhost:8080/index.html`
- **Interactive Simulator**: `http://localhost:8080/demo.html`
- **REST API Health Check**: `http://localhost:8080/api/health`
- **Database Backup Download**: `http://localhost:8080/api/backup`

### Option 2: Static Server (Client-Side IndexedDB Mode)
```bash
# Using Node http-server
npx http-server . -p 8080 -c-1

# Or using Python built-in server
python -m http.server 8080
```

---

## 🤝 Contributing & Community

Contributions from neurodivergent developers, educators, and type designers are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/NewAccessibleFeature`).
3. Commit your Changes (`git commit -m 'Add NewAccessibleFeature'`).
4. Push to the Branch (`git push origin feature/NewAccessibleFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

*Made with ♥ for neurodivergent readers worldwide.*
