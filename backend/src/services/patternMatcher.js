/**
 * Pattern Matcher
 * Analyzes example data rows and infers filtering/aggregation patterns
 * to build candidate SQL query fragments before sending to the LLM.
 */

/**
 * Infer value type for SQL generation.
 */
function inferType(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    if (/^\d+$/.test(value)) return 'integer_string';
    return 'string';
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

/**
 * Format a value for SQL based on its inferred type.
 */
function formatSQLValue(value) {
  if (value === null || value === undefined) return 'NULL';
  const type = inferType(value);
  if (type === 'string' || type === 'date') return `'${value.replace(/'/g, "''")}'`;
  if (type === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

/**
 * Detect if examples suggest aggregation (e.g., count, sum, avg fields).
 */
function detectAggregation(examples) {
  const aggregationKeywords = ['count', 'total', 'sum', 'avg', 'average', 'max', 'min', 'num_'];
  const keys = examples.flatMap(e => Object.keys(e));
  return keys.some(k => aggregationKeywords.some(kw => k.toLowerCase().includes(kw)));
}

/**
 * Detect if examples suggest ordering (e.g., rank, position fields or sorted values).
 */
function detectOrdering(examples) {
  const orderKeywords = ['rank', 'position', 'order', 'top', 'first', 'last'];
  const keys = examples.flatMap(e => Object.keys(e));
  return keys.some(k => orderKeywords.some(kw => k.toLowerCase().includes(kw)));
}

/**
 * Find common fields across all examples.
 */
function getCommonFields(examples) {
  if (!examples.length) return [];
  const fieldSets = examples.map(e => new Set(Object.keys(e)));
  const first = fieldSets[0];
  return [...first].filter(f => fieldSets.every(s => s.has(f)));
}

/**
 * Analyze value patterns across examples for a given field.
 * Returns: { type, values, isConstant, range, pattern }
 */
function analyzeFieldValues(examples, field) {
  const values = examples.map(e => e[field]).filter(v => v !== undefined);
  const types = [...new Set(values.map(inferType))];
  const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))].map(v => JSON.parse(v));
  const isConstant = uniqueValues.length === 1;

  let range = null;
  if (types.includes('integer') || types.includes('float')) {
    const nums = values.filter(v => typeof v === 'number');
    if (nums.length > 0) {
      range = { min: Math.min(...nums), max: Math.max(...nums) };
    }
  }

  // Detect string prefix/suffix patterns
  let pattern = null;
  if (types.includes('string') && values.length > 1) {
    const strs = values.filter(v => typeof v === 'string');
    if (strs.length > 1) {
      // Common prefix
      let prefix = strs[0];
      for (const s of strs.slice(1)) {
        while (!s.startsWith(prefix) && prefix.length > 0) {
          prefix = prefix.slice(0, -1);
        }
      }
      if (prefix.length > 2) pattern = { type: 'prefix', value: prefix };
    }
  }

  return { types, values, uniqueValues, isConstant, range, pattern };
}

/**
 * Build candidate WHERE clause fragments from examples.
 */
function buildCandidateFilters(examples, schema, targetTable) {
  const candidates = [];
  const commonFields = getCommonFields(examples);
  const tableSchema = schema[targetTable];

  if (!tableSchema) return candidates;

  const schemaColumns = tableSchema.columns.map(c => c.name.toLowerCase());

  for (const field of commonFields) {
    const fieldLower = field.toLowerCase();
    // Only consider fields that exist in the schema
    if (!schemaColumns.includes(fieldLower)) continue;

    const analysis = analyzeFieldValues(examples, field);

    if (analysis.isConstant && analysis.values[0] !== null) {
      // Exact match filter
      candidates.push({
        type: 'exact',
        field,
        value: analysis.values[0],
        sql: `"${field}" = ${formatSQLValue(analysis.values[0])}`,
        confidence: 0.9,
      });
    } else if (analysis.range && examples.length > 1) {
      // Range filter
      candidates.push({
        type: 'range',
        field,
        range: analysis.range,
        sql: `"${field}" BETWEEN ${analysis.range.min} AND ${analysis.range.max}`,
        confidence: 0.7,
      });
    } else if (analysis.pattern?.type === 'prefix') {
      // LIKE filter
      candidates.push({
        type: 'like',
        field,
        pattern: analysis.pattern.value,
        sql: `"${field}" LIKE '${analysis.pattern.value}%'`,
        confidence: 0.6,
      });
    } else if (analysis.uniqueValues.length <= 5 && analysis.uniqueValues.length > 1) {
      // IN filter
      const inList = analysis.uniqueValues.map(formatSQLValue).join(', ');
      candidates.push({
        type: 'in',
        field,
        values: analysis.uniqueValues,
        sql: `"${field}" IN (${inList})`,
        confidence: 0.75,
      });
    }
  }

  return candidates;
}

/**
 * Determine which tables are likely involved based on example fields.
 */
function identifyLikelyTables(examples, schema) {
  const exampleFields = new Set(
    examples.flatMap(e => Object.keys(e).map(k => k.toLowerCase()))
  );

  const tableScores = {};
  for (const [table, info] of Object.entries(schema)) {
    const tableFields = new Set(info.columns.map(c => c.name.toLowerCase()));
    const overlap = [...exampleFields].filter(f => tableFields.has(f)).length;
    const score = overlap / Math.max(exampleFields.size, 1);
    if (overlap > 0) tableScores[table] = { score, overlap };
  }

  return Object.entries(tableScores)
    .sort((a, b) => b[1].score - a[1].score)
    .map(([table, info]) => ({ table, ...info }));
}

/**
 * Build candidate SQL queries from examples + schema.
 * Returns an array of candidate query objects.
 */
function buildCandidateQueries(examples, schema) {
  if (!examples || examples.length === 0) return [];

  const likelyTables = identifyLikelyTables(examples, schema);
  if (likelyTables.length === 0) return [];

  const candidates = [];
  const hasAggregation = detectAggregation(examples);
  const hasOrdering = detectOrdering(examples);

  for (const { table } of likelyTables.slice(0, 3)) {
    const filters = buildCandidateFilters(examples, schema, table);
    const tableInfo = schema[table];
    const exampleFields = getCommonFields(examples);

    // Determine SELECT columns
    const schemaColNames = tableInfo.columns.map(c => c.name.toLowerCase());
    const selectCols = exampleFields
      .filter(f => schemaColNames.includes(f.toLowerCase()))
      .map(f => `"${f}"`);

    const selectClause = selectCols.length > 0 ? selectCols.join(', ') : '*';
    const whereClause = filters.length > 0
      ? 'WHERE ' + filters.map(f => f.sql).join(' AND ')
      : '';

    let sql = `SELECT ${selectClause} FROM "${table}"`;
    if (whereClause) sql += `\n${whereClause}`;
    if (hasOrdering) sql += `\nORDER BY 1 DESC`;
    sql += ';';    candidates.push({
      table,
      sql,
      filters,
      hasAggregation,
      hasOrdering,
      confidence: filters.reduce((sum, f) => sum + f.confidence, 0) / Math.max(filters.length, 1),
    });

    // Also generate a COUNT variant if aggregation detected
    if (hasAggregation) {
      const groupFields = exampleFields
        .filter(f => schemaColNames.includes(f.toLowerCase()) && !f.toLowerCase().includes('count'))
        .map(f => `"${f}"`);

      if (groupFields.length > 0) {
        let aggSql = `SELECT ${groupFields.join(', ')}, COUNT(*) AS count\nFROM "${table}"`;
        if (whereClause) aggSql += `\n${whereClause}`;
        aggSql += `\nGROUP BY ${groupFields.join(', ')}`;
        if (hasOrdering) aggSql += `\nORDER BY count DESC`;
        aggSql += ';';

        candidates.push({
          table,
          sql: aggSql,
          filters,
          hasAggregation: true,
          hasOrdering,
          confidence: 0.65,
          variant: 'aggregation',
        });
      }
    }
  }

  return candidates;
}

module.exports = {
  buildCandidateQueries,
  identifyLikelyTables,
  buildCandidateFilters,
  analyzeFieldValues,
  detectAggregation,
  detectOrdering,
  getCommonFields,
};
