const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory session store (replace with Redis/DB for production)
const sessions = new Map();

// POST /api/session/create
router.post('/create', (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    id: sessionId,
    createdAt: new Date().toISOString(),
    history: [],
  });
  res.json({ sessionId });
});

// GET /api/session/:sessionId
router.get('/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// POST /api/session/:sessionId/history
router.post('/:sessionId/history', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.history.push({
    timestamp: new Date().toISOString(),
    ...req.body,
  });

  res.json({ success: true });
});

// DELETE /api/session/:sessionId
router.delete('/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

module.exports = router;
