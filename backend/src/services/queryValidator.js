/**
 * Query Validator
 * Validates that query results match the provided examples.
 */

/**
 * Normalize a value for comparison (handle type coercion).
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).trim().toLowerCase();
}

/**
 * Check if a result row matches an example row.
 * Partial match: all example fields must be present and equal in the result row.
 */
function rowMatchesExample(resultRow, exampleRow) {
  for (const [key, exampleValue] of Object.entries(exampleRow)) {
    const resultValue = resultRow[key];
    if (resultValue === undefined) return false;

    const normExample = normalizeValue(exampleValue);
    const normResult = normalizeValue(resultValue);

    if (normExample !== normResult) return false;
  }
  return true;
}

/**
 * Validate query results against examples.
 * Returns a validation report.
 */
function validateResults(queryResults, examples) {
  const report = {
    totalExamples: examples.length,
    matchedExamples: 0,
    unmatchedExamples: [],
    totalResultRows: queryResults.length,
    matchRate: 0,
    isValid: false,
    details: [],
  };

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    const matchingRow = queryResults.find(row => rowMatchesExample(row, example));

    if (matchingRow) {
      report.matchedExamples++;
      report.details.push({
        exampleIndex: i,
        matched: true,
        matchedRow: matchingRow,
      });
    } else {
      report.unmatchedExamples.push(i);
      report.details.push({
        exampleIndex: i,
        matched: false,
        example,
        reason: findMismatchReason(queryResults, example),
      });
    }
  }

  report.matchRate = report.totalExamples > 0
    ? report.matchedExamples / report.totalExamples
    : 0;

  report.isValid = report.matchRate >= 0.8; // 80% match threshold

  return report;
}

/**
 * Try to explain why an example didn't match any result row.
 */
function findMismatchReason(results, example) {
  if (results.length === 0) return 'Query returned no rows.';

  const exampleKeys = Object.keys(example);
  const resultKeys = results.length > 0 ? Object.keys(results[0]) : [];

  const missingKeys = exampleKeys.filter(k => !resultKeys.includes(k));
  if (missingKeys.length > 0) {
    return `Result rows are missing fields: ${missingKeys.join(', ')}`;
  }

  // Find closest row
  let bestScore = 0;
  let bestRow = null;
  for (const row of results) {
    let score = 0;
    for (const key of exampleKeys) {
      if (normalizeValue(row[key]) === normalizeValue(example[key])) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  if (bestRow) {
    const mismatches = exampleKeys
      .filter(k => normalizeValue(bestRow[k]) !== normalizeValue(example[k]))
      .map(k => `${k}: expected "${example[k]}", got "${bestRow[k]}"`);
    return `Closest row mismatches: ${mismatches.join('; ')}`;
  }

  return 'No matching row found in results.';
}

/**
 * Sanitize SQL to prevent dangerous operations.
 */
function sanitizeSQL(sql) {
  const dangerous = [
    /\bDROP\b/i,
    /\bDELETE\b/i,
    /\bTRUNCATE\b/i,
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bEXEC\b/i,
    /\bEXECUTE\b/i,
  ];

  for (const pattern of dangerous) {
    if (pattern.test(sql)) {
      throw new Error(`SQL contains forbidden operation: ${pattern.source}`);
    }
  }

  return sql.trim();
}

module.exports = { validateResults, rowMatchesExample, sanitizeSQL };
