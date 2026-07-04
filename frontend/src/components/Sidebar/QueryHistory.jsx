import React from 'react';
import { useSession } from '../../context/SessionContext';

export default function QueryHistory() {
  const { queryHistory, deleteFromHistory } = useSession();

  if (queryHistory.length === 0) {
    return (
      <div className="schema-empty">
        <p>No queries yet. Generate your first query using examples.</p>
      </div>
    );
  }

  return (
    <div className="query-history">
      {queryHistory.map(entry => (
        <div key={entry.id} className="history-item">
          <div className="history-item-meta">
            <span className={`history-badge ${entry.validation?.isValid ? 'valid' : 'invalid'}`}>
              {entry.validation?.isValid ? '✓' : '~'}
            </span>
            <span className="history-time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className="history-rows">{entry.rowCount} rows</span>
            <button
              className="history-delete-btn"
              title="Delete from history"
              onClick={(e) => {
                e.stopPropagation();
                deleteFromHistory(entry.id);
              }}
            >
              ✕
            </button>
          </div>
          <pre className="history-sql">{entry.sql}</pre>
        </div>
      ))}
    </div>
  );
}
