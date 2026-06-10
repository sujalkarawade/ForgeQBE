import React, { useState, useCallback } from 'react';
import { useSession } from '../../context/SessionContext';
import api from '../../services/api';

const TYPE_COLORS = {
  integer: '#6366f1',
  bigint: '#6366f1',
  smallint: '#6366f1',
  numeric: '#6366f1',
  real: '#6366f1',
  'double precision': '#6366f1',
  'character varying': '#0d7a4e',
  character: '#0d7a4e',
  text: '#0d7a4e',
  boolean: '#9a5c00',
  date: '#c06c00',
  timestamp: '#c06c00',
  'timestamp without time zone': '#c06c00',
  'timestamp with time zone': '#c06c00',
  json: '#7c3aed',
  jsonb: '#7c3aed',
  uuid: '#7c879e',
};

function getTypeColor(type) {
  return TYPE_COLORS[type?.toLowerCase()] || '#7c879e';
}

function shortType(type) {
  const map = {
    'character varying': 'varchar',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    'double precision': 'float8',
  };
  return map[type?.toLowerCase()] || type;
}

/* ─── Sample Preview Panel ───────────────────────────────── */
function SamplePreview({ tableName, sessionId, columns, onClose }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSample = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/schema/${sessionId}/tables/${tableName}/sample`);
      setRows(res.data.rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, tableName]);

  // Auto-load on mount
  React.useEffect(() => { loadSample(); }, [loadSample]);

  const visibleCols = columns.slice(0, 6); // cap at 6 cols to fit sidebar

  return (
    <div className="sample-preview">
      <div className="sample-preview-header">
        <span className="sample-preview-title">Sample Data</span>
        <div className="sample-preview-actions">
          <button className="sample-refresh-btn" onClick={loadSample} title="Refresh" disabled={loading}>
            {loading ? <span className="spinner-xs" /> : '↺'}
          </button>
          <button className="sample-close-btn" onClick={onClose} title="Close">✕</button>
        </div>
      </div>

      {loading && !rows && (
        <div className="sample-loading">
          <span className="spinner-xs" /> Loading…
        </div>
      )}

      {error && (
        <div className="sample-error">⚠ {error}</div>
      )}

      {rows && rows.length === 0 && (
        <div className="sample-empty">No rows in this table</div>
      )}

      {rows && rows.length > 0 && (
        <div className="sample-scroll">
          <table className="sample-table">
            <thead>
              <tr>
                {visibleCols.map(col => (
                  <th key={col.name} title={col.name}>{col.name}</th>
                ))}
                {columns.length > 6 && <th className="sample-more-cols">+{columns.length - 6}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {visibleCols.map(col => {
                    const val = row[col.name];
                    const display = val === null || val === undefined
                      ? <span className="sample-null">null</span>
                      : typeof val === 'object'
                        ? <span className="sample-json">{JSON.stringify(val)}</span>
                        : String(val).length > 20
                          ? <span title={String(val)}>{String(val).slice(0, 20)}…</span>
                          : String(val);
                    return <td key={col.name}>{display}</td>;
                  })}
                  {columns.length > 6 && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows && (
        <div className="sample-footer">
          {rows.length} sample row{rows.length !== 1 ? 's' : ''} · {columns.length} columns
        </div>
      )}
    </div>
  );
}

/* ─── Schema Tree ────────────────────────────────────────── */
export default function SchemaTree() {
  const { schema, isConnected, sessionId } = useSession();
  const [expanded, setExpanded] = useState({});
  const [previewing, setPreviewing] = useState(null); // tableName | null

  if (!isConnected) {
    return <div className="schema-empty"><p>Connect to a database to explore its schema.</p></div>;
  }

  if (!schema) {
    return <div className="schema-empty"><p>No schema loaded.</p></div>;
  }

  const tables = Object.entries(schema);

  if (tables.length === 0) {
    return <div className="schema-empty"><p>No tables found in public schema.</p></div>;
  }

  const toggle = (table) => setExpanded(prev => ({ ...prev, [table]: !prev[table] }));

  const togglePreview = (e, tableName) => {
    e.stopPropagation();
    setPreviewing(prev => prev === tableName ? null : tableName);
  };

  return (
    <div className="schema-tree">
      <div className="schema-tree-header">
        <span className="schema-tree-count">{tables.length} tables</span>
      </div>

      {tables.map(([tableName, tableInfo]) => (
        <div key={tableName} className="schema-table">
          {/* Table row */}
          <div className="schema-table-row">
            <button
              className="schema-table-header"
              onClick={() => toggle(tableName)}
              aria-expanded={!!expanded[tableName]}
            >
              <span className={`schema-table-arrow ${expanded[tableName] ? 'open' : ''}`}>▸</span>
              <span className="schema-table-icon">⊞</span>
              <span className="schema-table-name">{tableName}</span>
              <span className="schema-table-count">{tableInfo.estimatedRowCount?.toLocaleString()}</span>
            </button>
            <button
              className={`schema-preview-btn ${previewing === tableName ? 'active' : ''}`}
              onClick={(e) => togglePreview(e, tableName)}
              title="Preview sample data"
            >
              ⊡
            </button>
          </div>

          {/* Column list */}
          {expanded[tableName] && (
            <div className="schema-columns">
              {tableInfo.columns.map(col => (
                <div key={col.name} className="schema-column">
                  <span className="schema-col-icon">
                    {col.isPrimaryKey ? '🔑' : col.nullable ? '◌' : '●'}
                  </span>
                  <span className="schema-col-name">{col.name}</span>
                  <span
                    className="schema-col-type"
                    style={{ color: getTypeColor(col.type) }}
                  >
                    {shortType(col.type)}
                  </span>
                </div>
              ))}
              {tableInfo.foreignKeys.length > 0 && (
                <div className="schema-fk-section">
                  {tableInfo.foreignKeys.map((fk, i) => (
                    <div key={i} className="schema-fk">
                      <span className="schema-fk-icon">↗</span>
                      <span>{fk.column} → {fk.referencesTable}.{fk.referencesColumn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sample preview panel */}
          {previewing === tableName && (
            <SamplePreview
              tableName={tableName}
              sessionId={sessionId}
              columns={tableInfo.columns}
              onClose={() => setPreviewing(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
