const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getConnection, testConnection, closeConnection, listSessions } = require('../db/connectionManager');

// POST /api/database/connect
router.post('/connect', [
  body('sessionId').notEmpty().withMessage('sessionId is required'),
  body('host').notEmpty().withMessage('host is required'),
  body('database').notEmpty().withMessage('database is required'),
  body('user').notEmpty().withMessage('user is required'),
  body('password').exists().withMessage('password is required'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { sessionId, host, port, database, user, password } = req.body;

  try {
    await getConnection(sessionId, { host, port, database, user, password });
    res.json({ success: true, message: `Connected to ${database} on ${host}` });
  } catch (err) {
    res.status(400).json({ error: `Connection failed: ${err.message}` });
  }
});

// POST /api/database/test
router.post('/test', [
  body('host').notEmpty(),
  body('database').notEmpty(),
  body('user').notEmpty(),
  body('password').exists(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { host, port, database, user, password } = req.body;

  try {
    const result = await testConnection({ host, port, database, user, password });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: `Connection test failed: ${err.message}` });
  }
});

// DELETE /api/database/disconnect/:sessionId
router.delete('/disconnect/:sessionId', async (req, res, next) => {
  const { sessionId } = req.params;
  try {
    await closeConnection(sessionId);
    res.json({ success: true, message: 'Disconnected' });
  } catch (err) {
    next(err);
  }
});

// GET /api/database/sessions
router.get('/sessions', (req, res) => {
  res.json({ sessions: listSessions() });
});

module.exports = router;
