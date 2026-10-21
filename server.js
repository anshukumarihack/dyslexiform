/**
 * DyslexiForm Full-Stack Backend Server
 * Built with zero external dependencies (Node.js native http, fs, path).
 * Provides static file hosting and a persistent JSON database store at /data/database.json.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

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
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'OK', database: 'connected', version: '2.1.4' }));
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

      if (db.users.some((u) => u.email === email)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email already registered' }));
        return;
      }

      const newUser = {
        id: (db.users.length ? Math.max(...db.users.map((u) => u.id)) : 0) + 1,
        name: body.name || 'Reader',
        email: email,
        passwordHash: Buffer.from(body.password).toString('base64'),
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
      const user = db.users.find((u) => u.email === email);

      if (!user || user.passwordHash !== Buffer.from(body.password || '').toString('base64')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }));
      return;
    }

    // GET /api/presets
    if (pathname === '/api/presets' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.presets));
      return;
    }

    // POST /api/presets
    if (pathname === '/api/presets' && req.method === 'POST') {
      const body = await parseBody(req);
      const newPreset = {
        id: (db.presets.length ? Math.max(...db.presets.map((p) => p.id)) : 0) + 1,
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

      db.presets.push(newPreset);
      writeDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newPreset));
      return;
    }

    // GET /api/reading-logs
    if (pathname === '/api/reading-logs' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.reading_logs));
      return;
    }

    // POST /api/reading-logs
    if (pathname === '/api/reading-logs' && req.method === 'POST') {
      const body = await parseBody(req);
      const newLog = {
        id: (db.reading_logs.length ? Math.max(...db.reading_logs.map((l) => l.id)) : 0) + 1,
        wpm: parseInt(body.wpm, 10) || 160,
        durationMinutes: parseInt(body.durationMinutes, 10) || 15,
        articleTitle: body.articleTitle || 'Reading Session',
        date: new Date().toISOString()
      };

      db.reading_logs.push(newLog);
      writeDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newLog));
      return;
    }

    // POST /api/contact
    if (pathname === '/api/contact' && req.method === 'POST') {
      const body = await parseBody(req);
      const msg = {
        id: Date.now(),
        name: body.name,
        email: body.email,
        subject: body.subject,
        message: body.message,
        createdAt: new Date().toISOString()
      };
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
        id: Date.now(),
        url: body.url,
        description: body.description,
        email: body.email,
        createdAt: new Date().toISOString()
      };
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

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  DyslexiForm Server & Database running on port ${PORT}`);
  console.log(`  • Platform:   http://localhost:${PORT}/index.html`);
  console.log(`  • Simulator:  http://localhost:${PORT}/demo.html`);
  console.log(`  • REST API:   http://localhost:${PORT}/api/health`);
  console.log(`  • Database:   ${DB_FILE}`);
  console.log(`======================================================\n`);
});
