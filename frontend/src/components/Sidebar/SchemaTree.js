import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';

const TYPE_COLORS = {
  integer: '#818cf8',
  bigint: '#818cf8',
  smallint: '#818cf8',
  numeric: '#818cf8',
  real: '#818cf8',
  'double precision': '#818cf8',
  character: '#34d399',
  'character varying': '#34d399',
  text: '#34d399',
  boolean: '#f59e0b',
  date: '#fb923c',
  timestamp: '#fb923c',
  'timestamp without time zone': '#fb923c',
  'timestamp with time zone': '#fb923c',
  json: '#a78bfa',
  jsonb: '#a78bfa',
  uuid: '#94a3b8',
};

function getTypeColor(type) {
  return TYPE_COLORS[type?.toLowerCase()] || '#94a3b8';
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

export default function SchemaTree() {
  const { schema, isConnected } = useSession();
  const [expanded, setExpanded] = useState({});

  if (!isConnected) {
    return (
      <div className="schema-empty">
        <p>Connect to a database to explore its schema.</p>
      </div>
    );
  }

  if (!schema) {
    return <div className="schema-empty"><p>No schema loaded.</p></div>;
  }

  const tables = Object.entries(schema);

  if (tables.length === 0) {
    return <div className="schema-empty"><p>No tables found in public schema.</p></div>;
  }

  const toggle = (table) => setExpanded(prev => ({ ...prev, [table]: !prev[table] }));

  return (
    <div className="schema-tree">
      <div className="schema-tree-header">
        <span className="schema-tree-count">{tables.length} tables</span>
      </div>
      {tables.map(([tableName, tableInfo]) => (
        <div key={tableName} className="schema-table">
          <button
            className="schema-table-header"
            onClick={() => toggle(tableName)}
            aria-expanded={!!expanded[tableName]}
          >
            <span className="schema-table-arrow">{expanded[tableName] ? '▾' : '▸'}</span>
            <span className="schema-table-icon">⊞</span>
            <span className="schema-table-name">{tableName}</span>
            <span className="schema-table-count">{tableInfo.estimatedRowCount?.toLocaleString()}</span>
          </button>

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
                      <span className="schema-fk-text">
                        {fk.column} → {fk.referencesTable}.{fk.referencesColumn}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
