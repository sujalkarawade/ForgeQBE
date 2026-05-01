const { executeQuery } = require('./connectionManager');

/**
 * Extract full schema: tables, columns, types, constraints, foreign keys.
 */
async function extractSchema(sessionId) {
  const schema = {};

  // Get all user tables
  const tablesResult = await executeQuery(sessionId, `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesResult.rows.map(r => r.table_name);

  for (const table of tables) {
    // Columns
    const colResult = await executeQuery(sessionId, `
      SELECT
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.is_nullable,
        c.column_default,
        c.ordinal_position
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = $1
      ORDER BY c.ordinal_position;
    `, [table]);

    // Primary keys
    const pkResult = await executeQuery(sessionId, `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `, [table]);

    const primaryKeys = pkResult.rows.map(r => r.column_name);

    // Foreign keys
    const fkResult = await executeQuery(sessionId, `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `, [table]);

    // Indexes
    const idxResult = await executeQuery(sessionId, `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1;
    `, [table]);

    // Row count estimate
    const countResult = await executeQuery(sessionId, `
      SELECT reltuples::bigint AS estimate
      FROM pg_class
      WHERE relname = $1;
    `, [table]);

    schema[table] = {
      columns: colResult.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        isPrimaryKey: primaryKeys.includes(col.column_name),
      })),
      primaryKeys,
      foreignKeys: fkResult.rows.map(fk => ({
        column: fk.column_name,
        referencesTable: fk.foreign_table,
        referencesColumn: fk.foreign_column,
      })),
      indexes: idxResult.rows.map(idx => ({
        name: idx.indexname,
        definition: idx.indexdef,
      })),
      estimatedRowCount: countResult.rows[0]?.estimate || 0,
    };
  }

  return schema;
}

/**
 * Get a compact schema summary string for LLM prompts.
 */
function schemaToPromptString(schema) {
  const lines = [];
  for (const [table, info] of Object.entries(schema)) {
    const cols = info.columns.map(c => {
      let desc = `${c.name} ${c.type.toUpperCase()}`;
      if (c.isPrimaryKey) desc += ' PK';
      if (!c.nullable) desc += ' NOT NULL';
      return desc;
    }).join(', ');
    lines.push(`Table "${table}": (${cols})`);

    if (info.foreignKeys.length > 0) {
      info.foreignKeys.forEach(fk => {
        lines.push(`  FK: ${table}.${fk.column} → ${fk.referencesTable}.${fk.referencesColumn}`);
      });
    }
  }
  return lines.join('\n');
}

/**
 * Get sample rows from a table to help the LLM understand data shape.
 */
async function getSampleRows(sessionId, tableName, limit = 3) {
  const result = await executeQuery(sessionId, `SELECT * FROM "${tableName}" LIMIT $1`, [limit]);
  return result.rows;
}

module.exports = { extractSchema, schemaToPromptString, getSampleRows };
