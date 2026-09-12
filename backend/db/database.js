const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'barber_booking.db');
const db = new Database(dbPath);

// Enable Foreign Keys & Write-Ahead Logging for concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  // Appointments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      email TEXT,
      service TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT CHECK(status IN ('confirmed', 'completed', 'cancelled')) NOT NULL DEFAULT 'confirmed',
      reminder_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Partial UNIQUE index to prevent duplicate active bookings for the same date & time
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_slot 
    ON appointments (appointment_date, appointment_time) 
    WHERE status != 'cancelled';
  `);

  // Admin slot overrides / manual blockings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT CHECK(status IN ('available', 'blocked')) NOT NULL DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, time)
    );
  `);

  // Admin users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);

  // WhatsApp outbound logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      type TEXT CHECK(type IN ('confirmation', 'reminder', 'cancellation')) NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create default admin if none exists
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(adminUsername);
  
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPassword, salt);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(adminUsername, hash);
    console.log(`[DB Init] Created default admin account (${adminUsername})`);
  }
}

initDb();

module.exports = db;
