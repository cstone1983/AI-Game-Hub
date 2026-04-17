import os
import sqlite3
import traceback
import subprocess
from flask import Flask, request, jsonify
from datetime import datetime
import config

app = Flask(__name__)
DB_PATH = 'hub.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Fail-safe database initialization"""
    try:
        conn = get_db_connection()
        conn.executescript('''
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

            INSERT OR IGNORE INTO users (id, username, password, email, is_admin) VALUES (1, 'admin', 'admin', 'admin@infinity.com', 1);
            INSERT OR IGNORE INTO modules (id, name, description, maintenance_mode) VALUES ('idle_flight', 'Idle Flight Manager', 'Build routes and manage fleets.', 0);
            INSERT OR IGNORE INTO modules (id, name, description, maintenance_mode) VALUES ('neon_matrix', 'Neon Matrix', 'High-speed evasion arcade.', 1);
        ''')
        conn.close()
    except Exception:
        print(traceback.format_exc())

# --- UNIVERSAL API CONTRACT ENDPOINTS ---

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ? AND password = ?', 
                           (data.get('username'), data.get('password'))).fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'id': user['id'], 
                'username': user['username'], 
                'is_admin': bool(user['is_admin']),
                'global_level': user['global_level'],
                'total_miles': user['total_miles']
            })
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception:
        return jsonify({'error': 'Login error', 'traceback': traceback.format_exc()}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
                     (data['username'], data['password'], data['email']))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': user_id, 'username': data['username'], 'is_admin': False, 'global_level': 1, 'total_miles': 0})
    except Exception:
        return jsonify({'error': 'Registration error', 'traceback': traceback.format_exc()}), 400

@app.route('/api/hub/modules', methods=['GET'])
def get_modules():
    try:
        conn = get_db_connection()
        modules = conn.execute('SELECT * FROM modules').fetchall()
        conn.close()
        return jsonify([dict(m) for m in modules])
    except Exception:
        return jsonify({'error': traceback.format_exc()}), 500

@app.route('/api/hub/maintenance', methods=['POST'])
def update_maintenance():
    try:
        data = request.json
        conn = get_db_connection()
        conn.execute('UPDATE modules SET maintenance_mode = ? WHERE id = ?', 
                    (1 if data.get('maintenance_mode') else 0, data.get('id')))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})
    except Exception:
        return jsonify({'error': traceback.format_exc()}), 500

import urllib.request
import json

@app.route('/api/hub/update', methods=['POST'])
def trigger_update():
    """Webhook Update Trigger for CI/CD - Proxies to Updater Service"""
    try:
        req = urllib.request.Request(
            'http://127.0.0.1:5050/update', 
            data=json.dumps(request.json or {}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
            return jsonify(data), response.status
    except Exception:
        return jsonify({'error': 'Failed to reach independent Updater Service on port 5050', 'traceback': traceback.format_exc()}), 500

@app.route('/api/hub/stats', methods=['GET'])
def stats():
    try:
        conn = get_db_connection()
        user_count = conn.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
        game_count = conn.execute('SELECT COUNT(DISTINCT game_id) as count FROM game_states').fetchone()['count']
        conn.close()
        return jsonify({'activeUsers': user_count, 'gamesTracked': game_count, 'status': 'Online'})
    except Exception:
        return jsonify({'status': 'Offline'}), 500

@app.route('/api/game/load_state', methods=['GET'])
def load_state():
    try:
        game_id = request.args.get('game_id')
        user_id = request.args.get('user_id')
        
        if not game_id or not user_id:
            return jsonify({'error': 'Missing game_id or user_id'}), 400

        conn = get_db_connection()
        state = conn.execute('SELECT save_data FROM game_states WHERE user_id = ? AND game_id = ?', 
                             (user_id, game_id)).fetchone()
        conn.close()

        if state:
            return state['save_data'] # Return as raw JSON string stored in DB
            
        # Strict fallback initialization format
        import json
        new_player_state = {
            "status": "new_player",
            "stats": {},
            "zone_charts": {},
            "short_forecast": {},
            "plane_condition": {},
            "bank_balance": config.GAME_CONFIG["economy"]["starting_balance"], 
            "miles": config.GAME_CONFIG["economy"]["starting_miles"], 
            "owned_planes": [], 
            "active_routes": [], 
            "last_saved": datetime.now().isoformat()
        }
        return jsonify(new_player_state)
    except Exception:
        return jsonify({'error': 'Internal Server Error', 'traceback': traceback.format_exc()}), 500

@app.route('/api/game/save_state', methods=['POST'])
def save_state():
    try:
        data = request.json
        user_id = data.get('user_id')
        game_id = data.get('game_id')
        save_data = data.get('save_data')

        if not all([user_id, game_id, save_data]):
             return jsonify({'error': 'Incomplete payload'}), 400

        conn = get_db_connection()
        conn.execute('''
            INSERT INTO game_states (user_id, game_id, save_data, last_updated)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, game_id) DO UPDATE SET
                save_data = excluded.save_data,
                last_updated = excluded.last_updated
        ''', (user_id, game_id, str(save_data), datetime.now().isoformat()))
        conn.commit()
        conn.close()

        return jsonify({'status': 'success'})
    except Exception:
        return jsonify({'error': 'Save failure', 'traceback': traceback.format_exc()}), 500

@app.route('/api/game/report_score', methods=['POST'])
def report_score():
    try:
        data = request.json
        conn = get_db_connection()
        conn.execute('INSERT INTO global_scores (user_id, game_id, score) VALUES (?, ?, ?)',
                     (data['user_id'], data['game_id'], data['score']))
        conn.commit()
        conn.close()
        return jsonify({'status': 'recorded'})
    except Exception:
        return jsonify({'error': 'Report failed', 'traceback': traceback.format_exc()}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000)
