import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './ExampleEditor.css';

const BLANK_ROW = () => ({ id: Date.now() + Math.random(), data: {} });
const DEFAULT_JSON = '[\n  {\n    \n  }\n]';

/* ─── Add Column Modal ───────────────────────────────────── */
function AddColumnModal({ onConfirm, onCancel, suggestions = [] }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && name.trim()) { e.preventDefault(); onConfirm(name.trim()); }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="col-modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="col-modal">
        <div className="col-modal-header">
          <span className="col-modal-title">Add Column</span>
          <button className="col-modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="col-modal-body">
          <label className="col-modal-label">Column name</label>
          <input
            ref={inputRef}
            className="col-modal-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. status, email, country…"
          />
          {suggestions.length > 0 && (
            <div className="col-modal-suggestions">
              <span className="col-modal-suggestions-label">From schema</span>
              <div className="col-modal-chips">
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="col-chip"
                    onClick={() => onConfirm(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="col-modal-footer">
          <button className="col-modal-btn-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="col-modal-btn-add"
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ExampleEditor({ onResult, onLoading, loading }) {
  const { sessionId, schema, addToHistory } = useSession();
  const [examples, setExamples] = useState([BLANK_ROW()]);
  const [hint, setHint] = useState('');
  const [inputMode, setInputMode] = useState('table');
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  const [jsonError, setJsonError] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [showColModal, setShowColModal] = useState(false);

  const tables = schema ? Object.keys(schema) : [];
  const tableColumns = selectedTable && schema?.[selectedTable]
    ? schema[selectedTable].columns
    : [];

  // Columns already added — suggest ones not yet in use
  const usedColumns = new Set(examples.flatMap(r => Object.keys(r.data)));
  const schemaSuggestions = tableColumns
    .map(c => c.name)
    .filter(n => !usedColumns.has(n));

  const addRow = () => setExamples(prev => [...prev, BLANK_ROW()]);

  const removeRow = (id) => {
    if (examples.length === 1) return;
    setExamples(prev => prev.filter(r => r.id !== id));
  };

  const updateCell = (id, field, value) => {
    setExamples(prev => prev.map(r =>
      r.id === id ? { ...r, data: { ...r.data, [field]: value } } : r
    ));
  };

  const removeColumn = (colName) => {
    setExamples(prev => prev.map(r => {
      const newData = { ...r.data };
      delete newData[colName];
      return { ...r, data: newData };
    }));
  };

  const confirmAddColumn = (name) => {
    setShowColModal(false);
    if (!name) return;
    setExamples(prev => prev.map(r => ({ ...r, data: { ...r.data, [name]: '' } })));
  };

  const handleClear = () => {
    setExamples([BLANK_ROW()]);
    setHint('');
    setJsonInput(DEFAULT_JSON);
    setJsonError('');
    setSelectedTable('');
    onResult(null);
  };

  const getColumns = () => {
    if (selectedTable && tableColumns.length > 0) {
      return tableColumns.map(c => c.name);
    }
    const cols = new Set(examples.flatMap(r => Object.keys(r.data)));
    return [...cols];
  };

  const handleJsonChange = (val) => {
    setJsonInput(val);
    try { JSON.parse(val); setJsonError(''); }
    catch (e) { setJsonError(e.message); }
  };

  const handleSubmit = useCallback(async () => {
    let parsedExamples;

    if (inputMode === 'json') {
      try {
        parsedExamples = JSON.parse(jsonInput);
        if (!Array.isArray(parsedExamples)) throw new Error('Must be an array');
        if (parsedExamples.length === 0) throw new Error('Array must not be empty');
      } catch (e) {
        toast.error(`Invalid JSON: ${e.message}`);
        return;
      }
    } else {
      const cols = getColumns();
      parsedExamples = examples.map(r => {
        const obj = {};
        cols.forEach(col => {
          const val = r.data[col];
          if (val !== undefined && val !== '') {
            const num = Number(val);
            obj[col] = !isNaN(num) && val !== '' ? num : val;
          }
        });
        return obj;
      }).filter(r => Object.keys(r).length > 0);

      if (parsedExamples.length === 0) {
        toast.error('Please fill in at least one example row.');
        return;
      }
    }

    onLoading(true);
    onResult(null);

    try {
      const res = await api.post('/query/generate', {
        sessionId,
        examples: parsedExamples,
        hint,
      });

      onResult(res.data);
      addToHistory({
        sql: res.data.sql,
        rowCount: res.data.results.rowCount,
        validation: res.data.validation,
        examples: parsedExamples,
      });
    } catch (err) {
      toast.error(err.message);
      onResult({ error: err.message });
    } finally {
      onLoading(false);
    }
  }, [inputMode, jsonInput, examples, hint, sessionId, onResult, onLoading, addToHistory]);

  const columns = getColumns();

  return (
    <>
      <div className="example-editor">
        {/* Header */}
        <div className="editor-header">
          <div className="editor-header-left">
            <span className="editor-step">1</span>
            <span className="editor-title">Provide Example Data</span>
            <span className="editor-desc">— rows representing the data you want to find</span>
          </div>
          <div className="editor-mode-toggle">
            <button
              className={`mode-btn ${inputMode === 'table' ? 'active' : ''}`}
              onClick={() => setInputMode('table')}
            >
              Table
            </button>
            <button
              className={`mode-btn ${inputMode === 'json' ? 'active' : ''}`}
              onClick={() => setInputMode('json')}
            >
              JSON
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="editor-body">
          {/* Table selector */}
          {tables.length > 0 && inputMode === 'table' && (
            <div className="table-selector">
              <label htmlFor="table-select">Target table</label>
              <select
                id="table-select"
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
              >
                <option value="">Auto-detect</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Table mode */}
          {inputMode === 'table' && (
            <div className="table-editor">
              <div className="table-wrapper">
                <table className="example-table">
                  <thead>
                    <tr>
                      <th className="row-num">#</th>
                      {columns.map(col => (
                        <th key={col} className="col-header">
                          <span className="col-header-name">{col}</span>
                          {/* Only show remove on manually added cols (not from schema) */}
                          {!tableColumns.find(c => c.name === col) && (
                            <button
                              className="btn-remove-col"
                              onClick={() => removeColumn(col)}
                              title={`Remove column "${col}"`}
                            >✕</button>
                          )}
                        </th>
                      ))}
                      <th className="col-add">
                        <button
                          className="btn-add-col"
                          onClick={() => setShowColModal(true)}
                          title="Add column"
                        >+</button>
                      </th>
                      <th className="col-del" />
                    </tr>
                  </thead>
                  <tbody>
                    {examples.map((row, idx) => (
                      <tr key={row.id}>
                        <td className="row-num">{idx + 1}</td>
                        {columns.map(col => (
                          <td key={col}>
                            <input
                              type="text"
                              value={row.data[col] ?? ''}
                              onChange={e => updateCell(row.id, col, e.target.value)}
                              placeholder="value"
                            />
                          </td>
                        ))}
                        <td />
                        <td className="col-del">
                          <button
                            className="btn-del-row"
                            onClick={() => removeRow(row.id)}
                            disabled={examples.length === 1}
                            title="Remove row"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn-add-row" onClick={addRow}>+ Add Row</button>
            </div>
          )}

          {/* JSON mode */}
          {inputMode === 'json' && (
            <div className="json-editor">
              <textarea
                className={`json-textarea ${jsonError ? 'has-error' : ''}`}
                value={jsonInput}
                onChange={e => handleJsonChange(e.target.value)}
                spellCheck={false}
                placeholder='[{"column": "value"}]'
              />
              {jsonError && <p className="json-error">⚠ {jsonError}</p>}
            </div>
          )}

          {/* Hint */}
          <div className="hint-section">
            <label htmlFor="hint-input" className="hint-label">
              <span className="editor-step">2</span>
              Describe what you want&nbsp;
              <span className="hint-label-opt">(optional)</span>
            </label>
            <input
              id="hint-input"
              type="text"
              className="hint-input"
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="e.g. 'Find all orders from last month with status shipped'"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <span className="editor-footer-hint">
            {columns.length > 0
              ? `${examples.length} row${examples.length !== 1 ? 's' : ''} · ${columns.length} column${columns.length !== 1 ? 's' : ''}`
              : 'Add columns to begin'}
          </span>
          <div className="editor-footer-actions">
            <button className="btn-clear" onClick={handleClear} disabled={loading}>
              Clear
            </button>
            <button className="btn-generate" onClick={handleSubmit} disabled={loading}>
              {loading
                ? <><span className="spinner-btn" /> Generating SQL…</>
                : <>Generate SQL Query →</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Add Column Modal */}
      {showColModal && (
        <AddColumnModal
          onConfirm={confirmAddColumn}
          onCancel={() => setShowColModal(false)}
          suggestions={schemaSuggestions}
        />
      )}
    </>
  );
}
