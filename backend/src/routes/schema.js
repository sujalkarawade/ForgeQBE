const express = require('express');
const router = express.Router();
const { extractSchema, getSampleRows } = require('../db/schemaInspector');

// GET /api/schema/:sessionId
router.get('/:sessionId', async (req, res, next) => {
  const { sessionId } = req.params;
  try {
    const schema = await extractSchema(sessionId);
    res.json({ schema });
  } catch (err) {
    if (err.message.includes('No active database connection')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/schema/:sessionId/tables/:tableName/sample
router.get('/:sessionId/tables/:tableName/sample', async (req, res, next) => {
  const { sessionId, tableName } = req.params;
  const limit = parseInt(req.query.limit) || 5;
  try {
    const rows = await getSampleRows(sessionId, tableName, limit);
    res.json({ rows, table: tableName });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
