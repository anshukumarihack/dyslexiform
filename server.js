/**
 * DyslexiForm Full-Stack Backend Server
 * Built with Node.js http, fs, and path.
 * Supports MySQL Database (via mysql2/promise) and local JSON persistence (/data/database.json).
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysqlDb = require('./mysql_db');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure database directory & initial seed file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DB = {
  users: [
    {
      id: 1,
      name: 'Alex Johnson',
      email: 'alex@dyslexiform.org',
      passwordHash: Buffer.from('password123').toString('base64'),
      role: 'student',
      createdAt: new Date().toISOString()
    }
  ],
  presets: [
    {
      id: 1,
      userId: 1,
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
    },
    {
      id: 2,
      userId: 1,
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
    }
  ],
  reading_logs: [
    { id: 1, userId: 1, wpm: 154, durationMinutes: 15, articleTitle: 'Baseline Trial', date: new Date().toISOString() },
    { id: 2, userId: 1, wpm: 182, durationMinutes: 20, articleTitle: 'Cognitive Science Article', date: new Date().toISOString() }
  ],
  cohorts: [
    { id: 1, name: 'Grade 6 — Blue Cohort', studentCount: 24, activePreset: 'Gentle Flow (Lexend)', lastUpdated: new Date().toISOString() },
    { id: 2, name: 'Grade 8 — Green Cohort', studentCount: 18, activePreset: 'Deep Focus (OpenDyslexic)', lastUpdated: new Date().toISOString() }
  ],
  contact_messages: [],
  barrier_reports: []
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return DEFAULT_DB;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ───────────────────────────────────────────────
  // REST API ROUTES (/api/*)
  // ───────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const db = readDB();

    // GET /api/health
    if (pathname === '/api/health') {
      const mysqlStatus = mysqlDb.getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'OK',
        version: '2.1.4',
        database: mysqlStatus.connected ? 'mysql' : 'json_file',
        mysql: mysqlStatus
      }));
      return;
    }

    // POST /api/register
    if (pathname === '/api/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').toLowerCase().trim();
      if (!email || !body.password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email and password are required' }));
        return;
      }

      // Check existing user in MySQL if connected
      let existingUser = null;
      if (mysqlDb.isConnected) {
        try {
          existingUser = await mysqlDb.findUserByEmail(email);
        } catch (e) {
          console.error('[MySQL Error] findUserByEmail:', e.message);
        }
      }
      if (!existingUser && db.users.some((u) => u.email === email)) {
        existingUser = true;
      }

      if (existingUser) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email already registered' }));
        return;
      }

      const passwordHash = Buffer.from(body.password).toString('base64');
      let createdUser = null;

      if (mysqlDb.isConnected) {
        try {
          createdUser = await mysqlDb.createUser({
            name: body.name || 'Reader',
            email: email,
            passwordHash: passwordHash,
            role: body.role || 'student'
          });
        } catch (e) {
          console.error('[MySQL Error] createUser:', e.message);
        }
      }

      const newUser = createdUser || {
        id: (db.users.length ? Math.max(...db.users.map((u) => u.id)) : 0) + 1,
        name: body.name || 'Reader',
        email: email,
        passwordHash: passwordHash,
        role: body.role || 'student',
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      writeDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }));
      return;
    }

    // POST /api/login
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').toLowerCase().trim();
      let user = null;

      if (mysqlDb.isConnected) {
        try {
          const sqlUser = await mysqlDb.findUserByEmail(email);
          if (sqlUser) {
            user = {
              id: sqlUser.id,
              name: sqlUser.name,
              email: sqlUser.email,
              role: sqlUser.role,
              passwordHash: sqlUser.password_hash
            };
          }
        } catch (e) {
          console.error('[MySQL Error] findUserByEmail:', e.message);
        }
      }

      if (!user) {
        user = db.users.find((u) => u.email === email);
      }

      if (!user || user.passwordHash !== Buffer.from(body.password || '').toString('base64')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }));
      return;
    }

    // GET /api/user/profile
    if (pathname === '/api/user/profile' && req.method === 'GET') {
      const email = parsedUrl.query.email || '';
      let user = null;
      if (mysqlDb.isConnected && email) {
        try {
          const sqlUser = await mysqlDb.findUserByEmail(email);
          if (sqlUser) {
            user = { id: sqlUser.id, name: sqlUser.name, email: sqlUser.email, role: sqlUser.role, createdAt: sqlUser.created_at, lastLogin: sqlUser.last_login };
          }
        } catch (e) {
          console.error('[MySQL Error] findUserByEmail:', e.message);
        }
      }
      if (!user) {
        user = db.users.find(u => u.email === email) || db.users[0];
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user }));
      return;
    }

    // PUT /api/user/profile
    if (pathname === '/api/user/profile' && req.method === 'PUT') {
      const body = await parseBody(req);
      const email = (body.email || '').toLowerCase().trim();
      let updatedUser = null;

      if (mysqlDb.isConnected) {
        try {
          const existing = await mysqlDb.findUserByEmail(email);
          if (existing) {
            const passwordHash = body.newPassword ? Buffer.from(body.newPassword).toString('base64') : null;
            updatedUser = await mysqlDb.updateUser(existing.id, {
              name: body.name,
              role: body.role,
              passwordHash: passwordHash
            });
          }
        } catch (e) {
          console.error('[MySQL Error] updateUser:', e.message);
        }
      }

      // Also update local JSON
      const uIdx = db.users.findIndex(u => u.email === email);
      if (uIdx !== -1) {
        if (body.name) db.users[uIdx].name = body.name;
        if (body.role) db.users[uIdx].role = body.role;
        if (body.newPassword) db.users[uIdx].passwordHash = Buffer.from(body.newPassword).toString('base64');
        writeDB(db);
        if (!updatedUser) updatedUser = db.users[uIdx];
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, user: updatedUser }));
      return;
    }

    // GET /api/presets
    if (pathname === '/api/presets' && req.method === 'GET') {
      let presets = null;
      if (mysqlDb.isConnected) {
        try {
          presets = await mysqlDb.getPresets();
        } catch (e) {
          console.error('[MySQL Error] getPresets:', e.message);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(presets || db.presets));
      return;
    }

    // POST /api/presets
    if (pathname === '/api/presets' && req.method === 'POST') {
      const body = await parseBody(req);
      const presetData = {
        name: body.name || 'My Preset',
        fontFamily: body.fontFamily || 'Lexend',
        fontSize: body.fontSize || 105,
        lineHeight: body.lineHeight || 1.75,
        letterSpacing: body.letterSpacing || 0.04,
        wordSpacing: body.wordSpacing || 0.12,
        bionicMode: Boolean(body.bionicMode),
        readingRuler: Boolean(body.readingRuler),
        pageTint: body.pageTint || 'none',
        createdAt: new Date().toISOString()
      };

      let newPreset = null;
      if (mysqlDb.isConnected) {
        try {
          newPreset = await mysqlDb.createPreset(presetData);
        } catch (e) {
          console.error('[MySQL Error] createPreset:', e.message);
        }
      }

      if (!newPreset) {
        newPreset = {
          id: (db.presets.length ? Math.max(...db.presets.map((p) => p.id)) : 0) + 1,
          ...presetData
        };
      }

      db.presets.push(newPreset);
      writeDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newPreset));
      return;
    }

    // GET /api/reading-logs
    if (pathname === '/api/reading-logs' && req.method === 'GET') {
      let logs = null;
      if (mysqlDb.isConnected) {
        try {
          logs = await mysqlDb.getReadingLogs();
        } catch (e) {
          console.error('[MySQL Error] getReadingLogs:', e.message);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs || db.reading_logs));
      return;
    }

    // POST /api/reading-logs
    if (pathname === '/api/reading-logs' && req.method === 'POST') {
      const body = await parseBody(req);
      const logData = {
        wpm: parseInt(body.wpm, 10) || 160,
        durationMinutes: parseInt(body.durationMinutes, 10) || 15,
        articleTitle: body.articleTitle || 'Reading Session',
        date: new Date().toISOString()
      };

      let newLog = null;
      if (mysqlDb.isConnected) {
        try {
          newLog = await mysqlDb.createReadingLog(logData);
        } catch (e) {
          console.error('[MySQL Error] createReadingLog:', e.message);
        }
      }

      if (!newLog) {
        newLog = {
          id: (db.reading_logs.length ? Math.max(...db.reading_logs.map((l) => l.id)) : 0) + 1,
          ...logData
        };
      }

      db.reading_logs.push(newLog);
      writeDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newLog));
      return;
    }

    // GET /api/cohorts
    if (pathname === '/api/cohorts' && req.method === 'GET') {
      let cohorts = null;
      if (mysqlDb.isConnected) {
        try {
          cohorts = await mysqlDb.getCohorts();
        } catch (e) {
          console.error('[MySQL Error] getCohorts:', e.message);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cohorts || db.cohorts));
      return;
    }

    // POST /api/contact
    if (pathname === '/api/contact' && req.method === 'POST') {
      const body = await parseBody(req);
      const msg = {
        name: body.name,
        email: body.email,
        subject: body.subject,
        message: body.message,
        createdAt: new Date().toISOString()
      };

      if (mysqlDb.isConnected) {
        try {
          await mysqlDb.createContactMessage(msg);
        } catch (e) {
          console.error('[MySQL Error] createContactMessage:', e.message);
        }
      }

      msg.id = Date.now();
      db.contact_messages.push(msg);
      writeDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Received inquiry' }));
      return;
    }

    // POST /api/barrier-report
    if (pathname === '/api/barrier-report' && req.method === 'POST') {
      const body = await parseBody(req);
      const report = {
        url: body.url,
        description: body.description,
        email: body.email || 'Anonymous',
        createdAt: new Date().toISOString()
      };

      if (mysqlDb.isConnected) {
        try {
          await mysqlDb.createBarrierReport(report);
        } catch (e) {
          console.error('[MySQL Error] createBarrierReport:', e.message);
        }
      }

      report.id = Date.now();
      db.barrier_reports.push(report);
      writeDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Logged barrier report' }));
      return;
    }

    // GET /api/backup (Export complete database)
    if (pathname === '/api/backup' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="dyslexiform_database_backup.json"'
      });
      res.end(JSON.stringify(db, null, 2));
      return;
    }
  }

  // ───────────────────────────────────────────────
  // STATIC FILE HOSTING
  // ───────────────────────────────────────────────
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found — DyslexiForm');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

async function startServer() {
  await mysqlDb.initMySQL();

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  DyslexiForm Server & Database running on port ${PORT}`);
    console.log(`  • Platform:   http://localhost:${PORT}/index.html`);
    console.log(`  • Simulator:  http://localhost:${PORT}/demo.html`);
    console.log(`  • REST API:   http://localhost:${PORT}/api/health`);
    console.log(`  • Storage:    ${mysqlDb.isConnected ? 'MySQL (Active)' : 'Local JSON Fallback'}`);
    console.log(`======================================================\n`);
  });
}

startServer();
