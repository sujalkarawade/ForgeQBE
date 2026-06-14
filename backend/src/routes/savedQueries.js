const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  saveQuery,
  listQueries,
  getQuery,
  updateQuery,
  deleteQuery,
} = require('../services/savedQueriesStore');

/**
 * POST /api/query/save
 * Save a generated query.
 */
router.post('/save', [
  body('sessionId').notEmpty().withMessage('sessionId is required'),
  body('name').notEmpty().withMessage('name is required'),
  body('sql').notEmpty().withMessage('sql is required'),
  body('explanation').optional().isString(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { sessionId, name, sql, explanation } = req.body;
  const saved = saveQuery({ sessionId, name, sql, explanation });
  res.status(201).json(saved);
});

/**
 * GET /api/query/saved/:sessionId
 * List all saved queries for a session, newest first.
 */
router.get('/saved/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const queries = listQueries(sessionId);
  res.json(queries);
});

/**
 * GET /api/query/saved/:sessionId/:id
 * Get a single saved query by id.
 */
router.get('/saved/:sessionId/:id', (req, res) => {
  const { id } = req.params;
  const query = getQuery(id);
  if (!query) return res.status(404).json({ error: 'Saved query not found' });
  res.json(query);
});

/**
 * PUT /api/query/saved/:id
 * Update a saved query (rename).
 */
router.put('/saved/:id', [
  body('name').optional().isString(),
  body('sql').optional().isString(),
  body('explanation').optional().isString().default(null),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id } = req.params;
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.sql !== undefined) updates.sql = req.body.sql;
  if (req.body.explanation !== undefined) updates.explanation = req.body.explanation;

  const updated = updateQuery(id, updates);
  if (!updated) return res.status(404).json({ error: 'Saved query not found' });
  res.json(updated);
});

/**
 * DELETE /api/query/saved/:id
 * Delete a saved query.
 */
router.delete('/saved/:id', (req, res) => {
  const { id } = req.params;
  const deleted = deleteQuery(id);
  if (!deleted) return res.status(404).json({ error: 'Saved query not found' });
  res.json({ success: true });
});

module.exports = router;