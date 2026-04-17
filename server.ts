import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import { exec } from 'child_process';
import db from './src/lib/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- UNIVERSAL API CONTRACT ---
  
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
      if (user) {
        res.json({ id: user.id, username: user.username, is_admin: !!user.is_admin, global_level: user.global_level, total_miles: user.total_miles });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch(err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    try {
      const { username, password, email } = req.body;
      const stmt = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)');
      const info = stmt.run(username, password, email);
      res.json({ id: info.lastInsertRowid, username, is_admin: false, global_level: 1, total_miles: 0 });
    } catch(err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.get('/api/hub/modules', (req, res) => {
    try {
      const modules = db.prepare('SELECT * FROM modules').all();
      res.json(modules);
    } catch(err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/hub/maintenance', (req, res) => {
    try {
      const { id, maintenance_mode } = req.body;
      db.prepare('UPDATE modules SET maintenance_mode = ? WHERE id = ?').run(maintenance_mode ? 1 : 0, id);
      res.json({ status: 'success' });
    } catch(err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/hub/update', async (req, res) => {
    try {
      // Forward request to the local Native Updater Service
      const response = await fetch('http://127.0.0.1:5050/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
      });
      const data = await response.json();
      if (!response.ok) {
          return res.status(500).json(data);
      }
      res.json(data);
    } catch (err) {
      console.error('Updater unreachable:', err);
      // Fallback response if the independent service is not running
      res.status(500).json({ error: 'Updater Service offline or unreachable', details: String(err) });
    }
  });

  app.get('/api/game/load_state', (req, res) => {
    try {
      const { game_id, user_id } = req.query;
      if (!game_id || !user_id) return res.status(400).json({ error: 'Missing parameters' });
      const state = db.prepare('SELECT save_data FROM game_states WHERE user_id = ? AND game_id = ?').get(user_id, game_id) as { save_data: string } | undefined;
      
      if (state) {
          res.json(JSON.parse(state.save_data));
      } else {
          // Strict initialization and mapping of initial objects fallback format (Section 1 compliance)
          res.json({ 
              status: 'new_player',
              stats: {},
              zone_charts: {},
              short_forecast: {},
              plane_condition: {},
              bank_balance: 120000, 
              miles: 0, 
              owned_planes: [], 
              active_routes: [], 
              last_saved: new Date().toISOString()
          });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to load state', details: String(err) });
    }
  });

  app.post('/api/game/save_state', (req, res) => {
    try {
      const { user_id, game_id, save_data } = req.body;
      if (!user_id || !game_id || !save_data) return res.status(400).json({ error: 'Missing required payload fields' });
      const saveStr = JSON.stringify(save_data);
      db.prepare(`
        INSERT INTO game_states (user_id, game_id, save_data, last_updated)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, game_id) DO UPDATE SET
          save_data = excluded.save_data,
          last_updated = excluded.last_updated
      `).run(user_id, game_id, saveStr);
      res.json({ status: 'success', saved_at: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save state', details: String(err) });
    }
  });

  app.post('/api/game/report_score', (req, res) => {
    try {
      const { user_id, game_id, score } = req.body;
      db.prepare('INSERT INTO global_scores (user_id, game_id, score) VALUES (?, ?, ?)').run(user_id, game_id, score);
      res.json({ status: 'score_recorded' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to report score' });
    }
  });

  app.get('/api/hub/stats', (req, res) => {
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const gameCount = (db.prepare('SELECT COUNT(DISTINCT game_id) as count FROM game_states').get() as { count: number }).count;
    res.json({ activeUsers: userCount, gamesTracked: gameCount, status: 'Online' });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'mpa', 
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    app.get('/admin.html', (req, res) => res.sendFile(path.join(distPath, 'admin.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Master Hub server running on port ${PORT}`);
  });
}

startServer();
