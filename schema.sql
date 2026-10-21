-- ═══════════════════════════════════════════════════════════════════
-- DyslexiForm Database Schema for MySQL / MySQL Workbench
-- Database: dyslexiform
-- ═══════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS dyslexiform 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE dyslexiform;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'educator', 'adult') DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_email (email)
) ENGINE=InnoDB;

-- 2. Typographic Presets Table
CREATE TABLE IF NOT EXISTS presets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(100) NOT NULL,
  font_family VARCHAR(50) DEFAULT 'Lexend',
  font_size INT DEFAULT 105,
  line_height DECIMAL(3,2) DEFAULT 1.75,
  letter_spacing DECIMAL(4,3) DEFAULT 0.040,
  word_spacing DECIMAL(4,3) DEFAULT 0.120,
  bionic_mode BOOLEAN DEFAULT FALSE,
  reading_ruler BOOLEAN DEFAULT FALSE,
  page_tint VARCHAR(20) DEFAULT 'none',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_preset_user (user_id),
  CONSTRAINT fk_preset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Reading Analytics & Speed Logs Table
CREATE TABLE IF NOT EXISTS reading_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  wpm INT NOT NULL,
  duration_minutes INT DEFAULT 15,
  article_title VARCHAR(255) DEFAULT 'Reading Session',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_user (user_id),
  INDEX idx_log_date (created_at),
  CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Classroom Cohorts Table (Educator Hub)
CREATE TABLE IF NOT EXISTS cohorts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  student_count INT DEFAULT 20,
  active_preset VARCHAR(100) DEFAULT 'Gentle Flow (Lexend)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Contact Inquiries Table
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL,
  subject VARCHAR(100) DEFAULT 'General Inquiry',
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. Accessibility Barrier Reports Table
CREATE TABLE IF NOT EXISTS barrier_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  email VARCHAR(191) DEFAULT 'Anonymous',
  status VARCHAR(30) DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════════
-- Initial Seed Data
-- ═══════════════════════════════════════════════════════════════════

-- Insert default demo user (password: password123)
INSERT INTO users (id, name, email, password_hash, role) 
VALUES (1, 'Alex Johnson', 'alex@dyslexiform.org', 'cGFzc3dvcmQxMjM=', 'student')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default presets
INSERT INTO presets (user_id, name, font_family, font_size, line_height, letter_spacing, word_spacing, bionic_mode, reading_ruler, page_tint, is_default)
VALUES 
  (1, 'Gentle Flow (Default)', 'Lexend', 105, 1.75, 0.040, 0.120, FALSE, FALSE, 'cream', TRUE),
  (1, 'Deep Focus & Baselines', 'OpenDyslexic', 110, 1.90, 0.060, 0.160, FALSE, TRUE, 'none', FALSE),
  (1, 'Bionic Saccadic Velocity', 'Atkinson Hyperlegible', 105, 1.70, 0.030, 0.100, TRUE, TRUE, 'none', FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert baseline reading speed progression
INSERT INTO reading_logs (user_id, wpm, duration_minutes, article_title, created_at)
VALUES
  (1, 148, 15, 'Cognitive Science Baseline #1', DATE_SUB(NOW(), INTERVAL 14 DAY)),
  (1, 156, 15, 'Cognitive Science Baseline #2', DATE_SUB(NOW(), INTERVAL 13 DAY)),
  (1, 162, 15, 'Cognitive Science Baseline #3', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (1, 168, 15, 'Cognitive Science Baseline #4', DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (1, 172, 15, 'Cognitive Science Baseline #5', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (1, 178, 15, 'Cognitive Science Baseline #6', DATE_SUB(NOW(), INTERVAL 9 DAY)),
  (1, 175, 15, 'Cognitive Science Baseline #7', DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (1, 182, 15, 'Cognitive Science Baseline #8', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (1, 185, 15, 'Cognitive Science Baseline #9', DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (1, 188, 15, 'Cognitive Science Baseline #10', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (1, 190, 15, 'Cognitive Science Baseline #11', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (1, 192, 15, 'Cognitive Science Baseline #12', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (1, 195, 15, 'Cognitive Science Baseline #13', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (1, 198, 15, 'Cognitive Science Baseline #14', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Insert sample educator cohorts
INSERT INTO cohorts (name, student_count, active_preset)
VALUES 
  ('Grade 6 — Blue Cohort', 24, 'Gentle Flow (Lexend, 1.75×)'),
  ('Grade 8 — Green Cohort', 18, 'Deep Focus (OpenDyslexic, Ruler)')
ON DUPLICATE KEY UPDATE name = VALUES(name);
