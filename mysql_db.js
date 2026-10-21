/**
 * DyslexiForm MySQL Database Connector
 * Connects to MySQL Server / MySQL Workbench on 127.0.0.1:3306
 * Uses mysql2/promise connection pool with automatic fallback to JSON store.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dyslexiform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 3000
};

let pool = null;
let isConnected = false;
let lastError = null;

async function initMySQL() {
  try {
    pool = mysql.createPool(config);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isConnected = true;
    lastError = null;
    console.log(`[MySQL] Successfully connected to MySQL database "${config.database}" at ${config.host}:${config.port} (user: ${config.user})`);
    return true;
  } catch (err) {
    isConnected = false;
    lastError = err.message;
    console.warn(`[MySQL] Note: Could not connect to MySQL (${err.code || err.message}).`);
    console.warn(`[MySQL] Server will use local file database fallback. To activate MySQL:`);
    console.warn(`        1. Run schema.sql in MySQL Workbench`);
    console.warn(`        2. Set DB_PASSWORD in .env if your root user requires a password`);
    return false;
  }
}

// User operations
async function findUserByEmail(email) {
  if (!isConnected) return null;
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash, role = 'student' }) {
  if (!isConnected) return null;
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, role]
  );
  return { id: result.insertId, name, email, role };
}

async function getUserById(id) {
  if (!isConnected) return null;
  const [rows] = await pool.execute('SELECT id, name, email, role, created_at as createdAt, last_login as lastLogin FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function updateUser(id, { name, role, passwordHash }) {
  if (!isConnected) return null;
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (role) { updates.push('role = ?'); params.push(role); }
  if (passwordHash) { updates.push('password_hash = ?'); params.push(passwordHash); }
  if (updates.length === 0) return null;
  params.push(id);
  await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.execute('SELECT id, name, email, role, created_at as createdAt, last_login as lastLogin FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

// Preset operations
async function getPresets(userId = null) {
  if (!isConnected) return null;
  let query = 'SELECT id, user_id as userId, name, font_family as fontFamily, font_size as fontSize, line_height as lineHeight, letter_spacing as letterSpacing, word_spacing as wordSpacing, bionic_mode as bionicMode, reading_ruler as readingRuler, page_tint as pageTint, is_default as isDefault, created_at as createdAt FROM presets';
  let params = [];
  if (userId) {
    query += ' WHERE user_id = ? OR user_id IS NULL ORDER BY id ASC';
    params.push(userId);
  } else {
    query += ' ORDER BY id ASC';
  }
  const [rows] = await pool.execute(query, params);
  return rows.map(r => ({
    ...r,
    bionicMode: Boolean(r.bionicMode),
    readingRuler: Boolean(r.readingRuler),
    isDefault: Boolean(r.isDefault)
  }));
}

async function createPreset(preset) {
  if (!isConnected) return null;
  const [result] = await pool.execute(
    `INSERT INTO presets 
     (user_id, name, font_family, font_size, line_height, letter_spacing, word_spacing, bionic_mode, reading_ruler, page_tint, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      preset.userId || 1,
      preset.name || 'My Preset',
      preset.fontFamily || 'Lexend',
      preset.fontSize || 105,
      preset.lineHeight || 1.75,
      preset.letterSpacing || 0.040,
      preset.wordSpacing || 0.120,
      preset.bionicMode ? 1 : 0,
      preset.readingRuler ? 1 : 0,
      preset.pageTint || 'none',
      preset.isDefault ? 1 : 0
    ]
  );
  return { id: result.insertId, ...preset };
}

// Reading logs operations
async function getReadingLogs(userId = null) {
  if (!isConnected) return null;
  let query = 'SELECT id, user_id as userId, wpm, duration_minutes as durationMinutes, article_title as articleTitle, created_at as date FROM reading_logs';
  let params = [];
  if (userId) {
    query += ' WHERE user_id = ? ORDER BY id ASC';
    params.push(userId);
  } else {
    query += ' ORDER BY id ASC';
  }
  const [rows] = await pool.execute(query, params);
  return rows;
}

async function createReadingLog(log) {
  if (!isConnected) return null;
  const [result] = await pool.execute(
    'INSERT INTO reading_logs (user_id, wpm, duration_minutes, article_title) VALUES (?, ?, ?, ?)',
    [log.userId || 1, log.wpm, log.durationMinutes || 15, log.articleTitle || 'Reading Session']
  );
  return { id: result.insertId, ...log, date: new Date().toISOString() };
}

// Cohorts operations
async function getCohorts() {
  if (!isConnected) return null;
  const [rows] = await pool.execute(
    'SELECT id, name, student_count as studentCount, active_preset as activePreset, last_updated as lastUpdated FROM cohorts ORDER BY id ASC'
  );
  return rows;
}

// Contact inquiry operations
async function createContactMessage(msg) {
  if (!isConnected) return null;
  const [result] = await pool.execute(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
    [msg.name, msg.email, msg.subject || 'General Inquiry', msg.message]
  );
  return { id: result.insertId, ...msg, createdAt: new Date().toISOString() };
}

// Barrier report operations
async function createBarrierReport(report) {
  if (!isConnected) return null;
  const [result] = await pool.execute(
    'INSERT INTO barrier_reports (url, description, email) VALUES (?, ?, ?)',
    [report.url, report.description, report.email || 'Anonymous']
  );
  return { id: result.insertId, ...report, createdAt: new Date().toISOString() };
}

function getStatus() {
  return {
    connected: isConnected,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    lastError: lastError
  };
}

module.exports = {
  initMySQL,
  getStatus,
  findUserByEmail,
  createUser,
  getUserById,
  updateUser,
  getPresets,
  createPreset,
  getReadingLogs,
  createReadingLog,
  getCohorts,
  createContactMessage,
  createBarrierReport,
  get isConnected() { return isConnected; }
};
