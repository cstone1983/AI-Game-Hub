import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'hub.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT 0,
    global_level INTEGER DEFAULT 1,
    total_miles INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_id TEXT NOT NULL,
    save_data TEXT NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, game_id)
  );

  CREATE TABLE IF NOT EXISTS global_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    maintenance_mode BOOLEAN DEFAULT 0
  );

  -- Admin & Module Seeding
  INSERT OR IGNORE INTO users (id, username, password, email, is_admin) VALUES (1, 'admin', 'admin', 'admin@infinity.com', 1);
  INSERT OR IGNORE INTO modules (id, name, description, maintenance_mode) VALUES ('idle_flight', 'Idle Flight Manager', 'Build routes and manage fleets.', 0);
  INSERT OR IGNORE INTO modules (id, name, description, maintenance_mode) VALUES ('neon_matrix', 'Neon Matrix', 'High-speed evasion arcade.', 1);
`);

export default db;
