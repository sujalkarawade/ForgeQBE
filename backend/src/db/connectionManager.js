const { Pool } = require('pg');

// In-memory store of active DB connections keyed by sessionId
const connections = new Map();

/**
 * Create or retrieve a PostgreSQL connection pool for a session.
 * @param {string} sessionId
 * @param {object} config - { host, port, database, user, password }
 */
async function getConnection(sessionId, config) {
  if (connections.has(sessionId)) {
    return connections.get(sessionId);
  }

  const pool = new Pool({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test the connection
  const client = await pool.connect();
  client.release();

  connections.set(sessionId, { pool, config });
  return { pool, config };
}

/**
 * Test a connection without storing it.
 */
async function testConnection(config) {
  const pool = new Pool({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    client.release();
    await pool.end();
    return { success: true, version: result.rows[0].version };
  } catch (err) {
    await pool.end().catch(() => {});
    throw err;
  }
}

/**
 * Execute a query on a session's connection.
 */
async function executeQuery(sessionId, sql, params = []) {
  const conn = connections.get(sessionId);
  if (!conn) throw new Error('No active database connection for this session.');

  const start = Date.now();
  const result = await conn.pool.query(sql, params);
  const duration = Date.now() - start;

  return {
    rows: result.rows,
    rowCount: result.rowCount,
    fields: result.fields ? result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) : [],
    duration,
  };
}

/**
 * Close and remove a session's connection.
 */
async function closeConnection(sessionId) {
  const conn = connections.get(sessionId);
  if (conn) {
    await conn.pool.end().catch(() => {});
    connections.delete(sessionId);
  }
}

/**
 * List all active session IDs.
 */
function listSessions() {
  return Array.from(connections.keys());
}

module.exports = { getConnection, testConnection, executeQuery, closeConnection, listSessions };
