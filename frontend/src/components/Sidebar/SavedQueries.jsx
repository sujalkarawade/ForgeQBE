import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../../context/SessionContext';

export default function SavedQueries({ onLoadQuery, activeQueryId }) {
  const {
    savedQueries,
    savedQueriesLoading,
    fetchSavedQueries,
    renameQuery,
    deleteQuery,
    sessionId,
  } = useSession();

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (sessionId) {
      fetchSavedQueries();
    }
  }, [sessionId, fetchSavedQueries]);

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  const handleStartRename = (query) => {
    setRenamingId(query.id);
    setRenameValue(query.name);
    setConfirmDeleteId(null);
  };

  const handleConfirmRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameQuery(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmRename();
    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
  };

  const handleDelete = async (id) => {
    await deleteQuery(id);
    setConfirmDeleteId(null);
  };

  if (savedQueriesLoading) {
    return (
      <div className="sidebar-loading">
        <span className="spinner" /> Loading saved queries…
      </div>
    );
  }

  if (!savedQueries || savedQueries.length === 0) {
    return (
      <div className="schema-empty">
        <p>No saved queries yet. Save a query to see it here.</p>
      </div>
    );
  }

  return (
    <div className="saved-queries">
      {savedQueries.map(query => (
        <div
          key={query.id}
          className={`saved-query-item ${activeQueryId === query.id ? 'active' : ''}`}
        >
          <div className="saved-query-main" onClick={() => onLoadQuery(query)}>
            <div className="saved-query-header">
              {renamingId === query.id ? (
                <input
                  ref={renameInputRef}
                  className="saved-query-rename-input"
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={handleConfirmRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="saved-query-name" title={query.name}>
                  {query.name}
                </span>
              )}
            </div>
            <div className="saved-query-meta">
              <span className="saved-query-time">
                {new Date(query.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="saved-query-sql-preview">
                {query.sql.length > 60 ? query.sql.slice(0, 60) + '…' : query.sql}
              </span>
            </div>
          </div>

          <div className="saved-query-actions">
            <button
              className="saved-query-action"
              onClick={e => { e.stopPropagation(); handleStartRename(query); }}
              title="Rename"
            >
              ✎
            </button>
            <button
              className="saved-query-action delete"
              onClick={e => { e.stopPropagation(); setConfirmDeleteId(query.id); }}
              title="Delete"
            >
              ✕
            </button>
          </div>

          {/* Delete confirmation dialog */}
          {confirmDeleteId === query.id && (
            <div className="saved-query-confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
              <div className="saved-query-confirm" onClick={e => e.stopPropagation()}>
                <p>Delete "{query.name}"?</p>
                <div className="saved-query-confirm-actions">
                  <button
                    className="btn-confirm-cancel"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm-delete"
                    onClick={() => handleDelete(query.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}