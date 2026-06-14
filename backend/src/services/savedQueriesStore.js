/**
 * Local JSON file-based store for saved queries.
 * Used as a development/persistent store until a PostgreSQL table is added.
 * 
 * Schema:
 * {
 *   id: UUID,
 *   session_id: string,
 *   name: string,
 *   sql: string,
 *   explanation: string | null,
 *   created_at: ISO timestamp
 * }
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORE_PATH = path.join(__dirname, '..', '..', 'saved-queries.json');

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading saved queries store:', err.message);
  }
  return [];
}

function writeStore(data) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing saved queries store:', err.message);
    throw err;
  }
}

/**
 * Save a new query.
 */
function saveQuery({ sessionId, name, sql, explanation }) {
  const store = readStore();
  const query = {
    id: uuidv4(),
    session_id: sessionId,
    name,
    sql,
    explanation: explanation || null,
    created_at: new Date().toISOString(),
  };
  store.push(query);
  writeStore(store);
  return query;
}

/**
 * List saved queries for a session, newest first.
 */
function listQueries(sessionId) {
  const store = readStore();
  return store
    .filter(q => q.session_id === sessionId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Get a single saved query by id.
 */
function getQuery(id) {
  const store = readStore();
  return store.find(q => q.id === id) || null;
}

/**
 * Update a saved query (rename only supported for now, but allows full update).
 */
function updateQuery(id, updates) {
  const store = readStore();
  const idx = store.findIndex(q => q.id === id);
  if (idx === -1) return null;
  store[idx] = { ...store[idx], ...updates };
  writeStore(store);
  return store[idx];
}

/**
 * Delete a saved query by id.
 */
function deleteQuery(id) {
  const store = readStore();
  const idx = store.findIndex(q => q.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  writeStore(store);
  return true;
}

module.exports = {
  saveQuery,
  listQueries,
  getQuery,
  updateQuery,
  deleteQuery,
};