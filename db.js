/**
 * DyslexiForm Database Layer (DyslexiDB)
 * High-performance, client-side relational store built on IndexedDB.
 * Supports users, typographic presets, reading speed logs, educator cohorts,
 * contact inquiries, and accessibility barrier reports with JSON export/import.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DyslexiDB = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DB_NAME = 'DyslexiFormDB';
  const DB_VERSION = 1;

  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. Users Store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // 2. Presets Store
        if (!db.objectStoreNames.contains('presets')) {
          const presetStore = db.createObjectStore('presets', { keyPath: 'id', autoIncrement: true });
          presetStore.createIndex('userId', 'userId', { unique: false });
        }

        // 3. Reading Speed Logs Store
        if (!db.objectStoreNames.contains('reading_logs')) {
          const logStore = db.createObjectStore('reading_logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('userId', 'userId', { unique: false });
          logStore.createIndex('date', 'date', { unique: false });
        }

        // 4. Educator Cohorts Store
        if (!db.objectStoreNames.contains('cohorts')) {
          db.createObjectStore('cohorts', { keyPath: 'id', autoIncrement: true });
        }

        // 5. Contact Inquiries Store
        if (!db.objectStoreNames.contains('contact_messages')) {
          db.createObjectStore('contact_messages', { keyPath: 'id', autoIncrement: true });
        }

        // 6. Accessibility Barrier Reports Store
        if (!db.objectStoreNames.contains('barrier_reports')) {
          db.createObjectStore('barrier_reports', { keyPath: 'id', autoIncrement: true });
        }

        // 7. Global Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        reject('IndexedDB Error: ' + e.target.errorCode);
      };
    });
  }

  // Generic transactional helper
  function tx(storeName, mode, callback) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result;

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = (e) => reject(e.target.error);

        result = callback(store);
      });
    });
  }

  // Initial Seeding Data
  async function seedInitialData() {
    const existingUsers = await Users.getAll();
    if (existingUsers.length === 0) {
      // Seed demo student user
      const demoUser = await Users.register({
        name: 'Alex Johnson',
        email: 'alex@dyslexiform.org',
        password: 'password123',
        role: 'student'
      });

      // Seed default presets for this user
      await Presets.create({
        userId: demoUser.id,
        name: 'Gentle Flow (Default)',
        fontFamily: 'Lexend',
        fontSize: 105,
        lineHeight: 1.75,
        letterSpacing: 0.04,
        wordSpacing: 0.12,
        bionicMode: false,
        readingRuler: false,
        pageTint: 'cream',
        isDefault: true
      });

      await Presets.create({
        userId: demoUser.id,
        name: 'Deep Focus & Baselines',
        fontFamily: 'OpenDyslexic',
        fontSize: 110,
        lineHeight: 1.9,
        letterSpacing: 0.06,
        wordSpacing: 0.16,
        bionicMode: false,
        readingRuler: true,
        pageTint: 'none',
        isDefault: false
      });

      await Presets.create({
        userId: demoUser.id,
        name: 'Bionic Velocity',
        fontFamily: 'Atkinson Hyperlegible',
        fontSize: 105,
        lineHeight: 1.7,
        letterSpacing: 0.03,
        wordSpacing: 0.1,
        bionicMode: true,
        readingRuler: true,
        pageTint: 'none',
        isDefault: false
      });

      // Seed reading logs (14 days of progress)
      const baseWPM = [148, 156, 162, 168, 172, 178, 175, 182, 185, 188, 190, 192, 195, 198];
      for (let i = 0; i < baseWPM.length; i++) {
        await ReadingLogs.add({
          userId: demoUser.id,
          wpm: baseWPM[i],
          durationMinutes: 15,
          articleTitle: 'Cognitive Science Reading Sample #' + (i + 1),
          date: new Date(Date.now() - (14 - i) * 86400000).toISOString()
        });
      }

      // Seed educator cohorts
      await Cohorts.create({
        name: 'Grade 6 — Blue Cohort',
        studentCount: 24,
        activePreset: 'Gentle Flow (Lexend, 1.75×)',
        lastUpdated: new Date().toISOString()
      });

      await Cohorts.create({
        name: 'Grade 8 — Green Cohort',
        studentCount: 18,
        activePreset: 'Deep Focus (OpenDyslexic, Ruler)',
        lastUpdated: new Date().toISOString()
      });

      console.log('[DyslexiDB] Database initialized and seeded with demo records.');
    }
  }

  // ───────────────────────────────────────────────
  // USERS REPOSITORY
  // ───────────────────────────────────────────────
  const Users = {
    async register(userData) {
      const user = {
        name: userData.name,
        email: userData.email.toLowerCase().trim(),
        passwordHash: btoa(userData.password || 'password123'), // Clean demonstration hash
        role: userData.role || 'student',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      const id = await tx('users', 'readwrite', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.add(user);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject('Email already registered');
        });
      });

      user.id = id;
      return user;
    },

    async login(email, password) {
      const em = email.toLowerCase().trim();
      const all = await this.getAll();
      const user = all.find((u) => u.email === em);
      if (!user) throw new Error('User not found');
      if (user.passwordHash !== btoa(password)) throw new Error('Incorrect password');

      // Update last login
      user.lastLogin = new Date().toISOString();
      await tx('users', 'readwrite', (store) => store.put(user));
      return user;
    },

    async getAll() {
      return tx('users', 'readonly', (store) => {
        return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
        });
      });
    },

    async getById(id) {
      return tx('users', 'readonly', (store) => {
        return new Promise((resolve) => {
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result);
        });
      });
    }
  };

  // ───────────────────────────────────────────────
  // PRESETS REPOSITORY
  // ───────────────────────────────────────────────
  const Presets = {
    async create(presetData) {
      const preset = {
        userId: presetData.userId || 1,
        name: presetData.name || 'Custom Preset',
        fontFamily: presetData.fontFamily || 'Lexend',
        fontSize: presetData.fontSize || 105,
        lineHeight: presetData.lineHeight || 1.75,
        letterSpacing: presetData.letterSpacing || 0.04,
        wordSpacing: presetData.wordSpacing || 0.12,
        bionicMode: Boolean(presetData.bionicMode),
        readingRuler: Boolean(presetData.readingRuler),
        pageTint: presetData.pageTint || 'none',
        isDefault: Boolean(presetData.isDefault),
        createdAt: new Date().toISOString()
      };

      const id = await tx('presets', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.add(preset);
          req.onsuccess = () => resolve(req.result);
        });
      });

      preset.id = id;
      return preset;
    },

    async getAll(userId) {
      return tx('presets', 'readonly', (store) => {
        return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => {
            const list = req.result || [];
            if (userId) {
              resolve(list.filter((p) => p.userId === userId));
            } else {
              resolve(list);
            }
          };
        });
      });
    },

    async update(preset) {
      return tx('presets', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.put(preset);
          req.onsuccess = () => resolve(req.result);
        });
      });
    },

    async delete(id) {
      return tx('presets', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
        });
      });
    }
  };

  // ───────────────────────────────────────────────
  // READING LOGS REPOSITORY
  // ───────────────────────────────────────────────
  const ReadingLogs = {
    async add(logData) {
      const log = {
        userId: logData.userId || 1,
        wpm: parseInt(logData.wpm, 10) || 160,
        durationMinutes: parseInt(logData.durationMinutes, 10) || 10,
        articleTitle: logData.articleTitle || 'Web Reading Session',
        date: logData.date || new Date().toISOString()
      };

      const id = await tx('reading_logs', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.add(log);
          req.onsuccess = () => resolve(req.result);
        });
      });

      log.id = id;
      return log;
    },

    async getAll(userId) {
      return tx('reading_logs', 'readonly', (store) => {
        return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => {
            const list = req.result || [];
            if (userId) {
              resolve(list.filter((l) => l.userId === userId));
            } else {
              resolve(list);
            }
          };
        });
      });
    }
  };

  // ───────────────────────────────────────────────
  // COHORTS REPOSITORY (Educator)
  // ───────────────────────────────────────────────
  const Cohorts = {
    async create(cohortData) {
      const cohort = {
        name: cohortData.name || 'New Classroom Cohort',
        studentCount: parseInt(cohortData.studentCount, 10) || 20,
        activePreset: cohortData.activePreset || 'Gentle Flow (Lexend)',
        lastUpdated: new Date().toISOString()
      };

      const id = await tx('cohorts', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.add(cohort);
          req.onsuccess = () => resolve(req.result);
        });
      });

      cohort.id = id;
      return cohort;
    },

    async getAll() {
      return tx('cohorts', 'readonly', (store) => {
        return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
        });
      });
    },

    async update(cohort) {
      cohort.lastUpdated = new Date().toISOString();
      return tx('cohorts', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.put(cohort);
          req.onsuccess = () => resolve(req.result);
        });
      });
    }
  };

  // ───────────────────────────────────────────────
  // CONTACT MESSAGES REPOSITORY
  // ───────────────────────────────────────────────
  const ContactMessages = {
    async add(msgData) {
      const msg = {
        name: msgData.name,
        email: msgData.email,
        subject: msgData.subject || 'General Inquiry',
        message: msgData.message,
        createdAt: new Date().toISOString()
      };

      const id = await tx('contact_messages', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.add(msg);
          req.onsuccess = () => resolve(req.result);
        });
      });

      msg.id = id;
      return msg;
    },

    async getAll() {
      return tx('contact_messages', 'readonly', (store) => {
        return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
        });
      });
    }
  };

  // ───────────────────────────────────────────────
  // ACCESSIBILITY BARRIER REPORTS REPOSITORY
  // ───────────────────────────────────────────────
  const BarrierReports = {
    async add(reportData) {
      const report = {
        url: reportData.url,
        description: reportData.description,
        email: reportData.email || 'Anonymous',
        status: 'Open',
        createdAt: new Date().toISOString()
      };

      const id = await tx('barrier_reports', 'readwrite', (store) => {
        return new Promise((resolve) => {
          const req = store.add(report);
          req.onsuccess = () => resolve(req.result);
        });
      });

      report.id = id;
      return report;
    },

    async getAll() {
      return tx('barrier_reports', 'readonly', (store) => {
        return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
        });
      });
    }
  };

  // ───────────────────────────────────────────────
  // BACKUP & RESTORE UTILITIES
  // ───────────────────────────────────────────────
  async function exportAll() {
    return {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      users: await Users.getAll(),
      presets: await Presets.getAll(),
      reading_logs: await ReadingLogs.getAll(),
      cohorts: await Cohorts.getAll(),
      contact_messages: await ContactMessages.getAll(),
      barrier_reports: await BarrierReports.getAll()
    };
  }

  async function importAll(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file format');
    }

    if (Array.isArray(backupData.presets)) {
      for (const p of backupData.presets) {
        delete p.id;
        await Presets.create(p);
      }
    }

    if (Array.isArray(backupData.reading_logs)) {
      for (const l of backupData.reading_logs) {
        delete l.id;
        await ReadingLogs.add(l);
      }
    }

    if (Array.isArray(backupData.cohorts)) {
      for (const c of backupData.cohorts) {
        delete c.id;
        await Cohorts.create(c);
      }
    }

    return true;
  }

  async function resetDatabase() {
    const db = await openDB();
    db.close();
    dbInstance = null;
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = async () => {
        await seedInitialData();
        resolve(true);
      };
      req.onerror = () => reject('Could not reset database');
    });
  }

  // Initialize and seed on startup
  openDB().then(() => seedInitialData()).catch((err) => {
    console.warn('[DyslexiDB] IndexedDB initialization notice:', err);
  });

  return {
    openDB,
    Users,
    Presets,
    ReadingLogs,
    Cohorts,
    ContactMessages,
    BarrierReports,
    exportAll,
    importAll,
    resetDatabase
  };
});
