const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const { extractSchema, schemaToPromptString } = require('../db/schemaInspector');
const { buildCandidateQueries } = require('../services/patternMatcher');
const { rankAndRefineQueries, refineQuery } = require('../services/llmService');
const { executeQuery } = require('../db/connectionManager');
const { validateResults, sanitizeSQL } = require('../services/queryValidator');

/**
 * POST /api/query/generate
 * Main endpoint: takes examples → returns SQL + explanation + results
 */
router.post('/generate', [
  body('sessionId').notEmpty().withMessage('sessionId is required'),
  body('examples').isArray({ min: 1 }).withMessage('examples must be a non-empty array'),
  body('hint').optional().isString(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { sessionId, examples, hint = '' } = req.body;

  try {
    // Step 1: Extract schema
    const schema = await extractSchema(sessionId);
    const schemaString = schemaToPromptString(schema);

    // Step 2: Build candidate queries via pattern matching
    const candidates = buildCandidateQueries(examples, schema);

    // Step 3: LLM ranks and refines candidates
    const llmResult = await rankAndRefineQueries(examples, candidates, schemaString, hint);

    // Step 4: Sanitize and execute the winning query
    const safeSql = sanitizeSQL(llmResult.sql);
    const queryResult = await executeQuery(sessionId, safeSql);

    // Step 5: Validate results against examples
    const validation = validateResults(queryResult.rows, examples);

    res.json({
      sql: safeSql,
      explanation: llmResult.explanation,
      reasoning: llmResult.reasoning,
      confidence: llmResult.confidence,
      tablesUsed: llmResult.tablesUsed,
      results: {
        rows: queryResult.rows,
        rowCount: queryResult.rowCount,
        fields: queryResult.fields,
        duration: queryResult.duration,
      },
      validation,
      candidates: candidates.map(c => ({ sql: c.sql, confidence: c.confidence })),
      tokensUsed: llmResult.tokensUsed,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/query/execute
 * Execute a raw SQL query (read-only, validated).
 */
router.post('/execute', [
  body('sessionId').notEmpty(),
  body('sql').notEmpty().withMessage('sql is required'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { sessionId, sql } = req.body;

  try {
    const safeSql = sanitizeSQL(sql);
    const result = await executeQuery(sessionId, safeSql);
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields,
      duration: result.duration,
    });
  } catch (err) {
    if (err.message.includes('forbidden operation')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/query/refine
 * Refine an existing query based on user feedback.
 */
router.post('/refine', [
  body('sessionId').notEmpty(),
  body('originalSql').notEmpty(),
  body('feedback').notEmpty().withMessage('feedback is required'),
  body('examples').isArray(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { sessionId, originalSql, feedback, examples } = req.body;

  try {
    const schema = await extractSchema(sessionId);
    const schemaString = schemaToPromptString(schema);

    const refined = await refineQuery(originalSql, feedback, schemaString, examples);
    const safeSql = sanitizeSQL(refined.sql);
    const queryResult = await executeQuery(sessionId, safeSql);
    const validation = validateResults(queryResult.rows, examples);

    res.json({
      sql: safeSql,
      explanation: refined.explanation,
      changesMade: refined.changes_made,
      confidence: refined.confidence || null,
      tablesUsed: refined.tables_used || [],
      results: {
        rows: queryResult.rows,
        rowCount: queryResult.rowCount,
        fields: queryResult.fields,
        duration: queryResult.duration,
      },
      validation,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
