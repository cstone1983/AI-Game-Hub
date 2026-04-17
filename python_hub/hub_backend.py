import os
import sqlite3
import traceback
import subprocess
from flask import Flask, request, jsonify
from datetime import datetime

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
        ''')
        conn.close()
    except Exception:
        print(traceback.format_exc())

# --- UNIVERSAL API CONTRACT ENDPOINTS ---

@app.route('/api/hub/update', methods=['POST'])
def trigger_update():
    """Webhook Update Trigger for CI/CD"""
    try:
        data = request.json or {}
        target = data.get('target', 'all')
        
        # Execute the automated bash script
        # This points directly to the GitHub repo requested (cstone1983/AI-Game-Hub)
        result = subprocess.run(
            ['bash', 'scripts/update.sh'],
            capture_output=True,
            text=True,
            check=True
        )
        return jsonify({'status': 'success', 'output': result.stdout})
    except subprocess.CalledProcessError as e:
        return jsonify({'error': 'Git Pull/Update failed', 'traceback': e.stderr}), 500
    except Exception:
        return jsonify({'error': 'Internal Server Error', 'traceback': traceback.format_exc()}), 500


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
        return jsonify({'status': 'new_player'})
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
