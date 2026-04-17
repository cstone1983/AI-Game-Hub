import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import db from './src/lib/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- UNIVERSAL API CONTRACT ---

  /**
   * Load Game State
   * GET /api/game/load_state?game_id=...&user_id=...
   */
  app.get('/api/game/load_state', (req, res) => {
    try {
      const { game_id, user_id } = req.query;
      if (!game_id || !user_id) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      const state = db.prepare('SELECT save_data FROM game_states WHERE user_id = ? AND game_id = ?')
        .get(user_id, game_id) as { save_data: string } | undefined;

      res.json(state ? JSON.parse(state.save_data) : { status: 'new_player' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load state', details: String(err) });
    }
  });

  /**
   * Save Game State
   * POST /api/game/save_state
   */
  app.post('/api/game/save_state', (req, res) => {
    try {
      const { user_id, game_id, save_data } = req.body;
      if (!user_id || !game_id || !save_data) {
        return res.status(400).json({ error: 'Missing required payload fields' });
      }

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
      console.error(err);
      res.status(500).json({ error: 'Failed to save state', details: String(err) });
    }
  });

  /**
   * Report Score
   * POST /api/game/report_score
   */
  app.post('/api/game/report_score', (req, res) => {
    try {
      const { user_id, game_id, score } = req.body;
      db.prepare('INSERT INTO global_scores (user_id, game_id, score) VALUES (?, ?, ?)')
        .run(user_id, game_id, score);
      
      res.json({ status: 'score_recorded' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to report score' });
    }
  });

  // Admin / Hub Stats
  app.get('/api/hub/stats', (req, res) => {
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const gameCount = (db.prepare('SELECT COUNT(DISTINCT game_id) as count FROM game_states').get() as { count: number }).count;
    res.json({ activeUsers: userCount, gamesTracked: gameCount });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Master Hub server running on port ${PORT}`);
  });
}

startServer();
