import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import SqlBlock from '../shared/SqlBlock';
import DataTable from '../shared/DataTable';
import ValidationBadge from '../shared/ValidationBadge';
import { generateCSV, generateJSON, getExportFilename, downloadBlob } from '../../services/exportUtils';
import './QueryResult.css';

export default function QueryResult({ result, loading }) {
  const { sessionId, addToHistory, saveQuery } = useSession();
  const [activeTab, setActiveTab] = useState('results');
  const [feedback, setFeedback] = useState('');
  const [refining, setRefining] = useState(false);
  const [currentResult, setCurrentResult] = useState(result);
  // Stack of previous results for undo
  const [history, setHistory] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const saveInputRef = useRef(null);

  // Sync when parent result changes (new query generated)
  React.useEffect(() => {
    setCurrentResult(result);
    setHistory([]);
    setActiveTab('results');
    setFeedback('');
  }, [result]);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus save input when modal opens
  useEffect(() => {
    if (showSaveModal) {
      setTimeout(() => saveInputRef.current?.focus(), 100);
    }
  }, [showSaveModal]);

  const handleRefine = async () => {
    if (!feedback.trim()) {
      toast.error('Please describe what needs to change.');
      return;
    }
    setRefining(true);
    try {
      const res = await api.post('/query/refine', {
        sessionId,
        originalSql: currentResult.sql,
        feedback,
        examples: [],
      });

      // Push current onto undo stack before replacing
      setHistory(prev => [...prev, currentResult]);

      const refined = {
        ...currentResult,
        sql: res.data.sql,
        explanation: res.data.explanation,
        changesMade: res.data.changesMade,
        // Preserve confidence/tablesUsed from refine if returned, else keep previous
        confidence: res.data.confidence ?? currentResult.confidence,
        tablesUsed: res.data.tablesUsed?.length ? res.data.tablesUsed : currentResult.tablesUsed,
        results: res.data.results,
        validation: res.data.validation,
        // Clear reasoning and candidates — they don't apply to refined queries
        reasoning: null,
        candidates: [],
      };

      setCurrentResult(refined);
      addToHistory({
        sql: res.data.sql,
        rowCount: res.data.results.rowCount,
        validation: res.data.validation,
      });
      setFeedback('');
      setActiveTab('results');
      toast.success('Query refined!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefining(false);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentResult(prev);
    setActiveTab('results');
    toast('Reverted to previous query', { icon: '↩' });
  };

  const handleSaveClick = () => {
    setSaveName('');
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    setShowSaveModal(false);
    const query = currentResult;
    await saveQuery(saveName.trim(), query.sql, query.explanation || null);
    setSaving(false);
  };

  const handleSaveKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmSave();
    if (e.key === 'Escape') setShowSaveModal(false);
  };

  const handleExport = async (format) => {
    const rows = currentResult.results?.rows || [];
    const fields = currentResult.results?.fields || [];
    if (!rows.length) {
      toast.error('No results to export.');
      return;
    }
    setExportOpen(false);
    setExporting(true);
    try {
      // Use setTimeout to allow the UI to update before heavy work
      await new Promise(r => setTimeout(r, 0));
      const blob = format === 'csv'
        ? generateCSV(rows, fields)
        : generateJSON(rows);
      if (!blob) {
        toast.error('No data available for export.');
        return;
      }
      const filename = getExportFilename(format);
      downloadBlob(blob, filename);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="query-result loading-state">
        <div className="loading-animation">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
          <p>Analyzing patterns and generating SQL…</p>
          <p className="loading-sub">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (!currentResult) return null;

  if (currentResult.error) {
    return (
      <div className="query-result error-state">
        <div className="error-icon">⚠</div>
        <h3>Generation Failed</h3>
        <p>{currentResult.error}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'results', label: `Results (${currentResult.results?.rowCount ?? 0})` },
    { id: 'sql', label: 'SQL' },
    { id: 'explanation', label: 'Explanation' },
    { id: 'candidates', label: `Candidates (${currentResult.candidates?.length ?? 0})` },
  ];

  return (
    <div className="query-result">
      {/* Result header */}
      <div className="result-header">
        <div className="result-header-left">
          <h2 className="result-title">
            <span className="editor-step">3</span>
            Query Result
          </h2>
          <div className="result-meta">
            <ValidationBadge validation={currentResult.validation} />
            <span className="result-stat">
              {currentResult.results?.rowCount} rows
            </span>
            <span className="result-stat">
              {currentResult.results?.duration}ms
            </span>
            {currentResult.confidence != null && (
              <span className="result-stat confidence">
                {Math.round(currentResult.confidence * 100)}% confidence
              </span>
            )}
          </div>
        </div>
        <div className="result-header-right">
          {currentResult.sql && (
            <button
              className="btn-save-query"
              onClick={handleSaveClick}
              disabled={saving}
              title="Save this query"
            >
              {saving ? <span className="spinner-sm" /> : '★'} Save
            </button>
          )}
          {currentResult.results?.rows?.length > 0 && (
            <div className="export-wrapper" ref={exportRef}>
              <button
                className="btn-export"
                onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
                title="Export query results"
              >
                {exporting ? <span className="spinner-sm" /> : '⭳'} Export
              </button>
              {exportOpen && (
                <div className="export-dropdown">
                  <button
                    className="export-option"
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                  >
                    <span className="export-icon">📄</span>
                    <span className="export-label">Export as CSV</span>
                    <span className="export-hint">.csv</span>
                  </button>
                  <button
                    className="export-option"
                    onClick={() => handleExport('json')}
                    disabled={exporting}
                  >
                    <span className="export-icon">📋</span>
                    <span className="export-label">Export as JSON</span>
                    <span className="export-hint">.json</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {history.length > 0 && (
            <button className="btn-undo" onClick={handleUndo} title="Undo last refinement">
              ↩ Undo
            </button>
          )}
        </div>
      </div>

      {/* Changes-made banner — shown after a refinement */}
      {currentResult.changesMade && (
        <div className="changes-banner">
          <span className="changes-icon">✦</span>
          <span className="changes-text">{currentResult.changesMade}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="result-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`result-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="result-body">
        {activeTab === 'results' && (
          <DataTable
            rows={currentResult.results?.rows || []}
            fields={currentResult.results?.fields || []}
          />
        )}

        {activeTab === 'sql' && (
          <div className="sql-tab">
            <SqlBlock sql={currentResult.sql} />
            {currentResult.tablesUsed?.length > 0 && (
              <div className="tables-used">
                <span className="tables-used-label">Tables used:</span>
                {currentResult.tablesUsed.map(t => (
                  <span key={t} className="table-tag">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'explanation' && (
          <div className="explanation-tab">
            <div className="explanation-card">
              <h3>What this query does</h3>
              <p>{currentResult.explanation}</p>
            </div>
            {currentResult.reasoning && (
              <div className="explanation-card reasoning">
                <h3>Reasoning</h3>
                <p>{currentResult.reasoning}</p>
              </div>
            )}
            {currentResult.validation && (
              <div className="explanation-card validation">
                <h3>Validation</h3>
                <div className="validation-stats">
                  <div className="val-stat">
                    <span className="val-num">{currentResult.validation.matchedExamples}</span>
                    <span className="val-label">/ {currentResult.validation.totalExamples} examples matched</span>
                  </div>
                  <div className="val-stat">
                    <span className="val-num">{Math.round(currentResult.validation.matchRate * 100)}%</span>
                    <span className="val-label">match rate</span>
                  </div>
                </div>
                {currentResult.validation.unmatchedExamples?.length > 0 && (
                  <div className="unmatched-list">
                    <p className="unmatched-title">Unmatched examples:</p>
                    {currentResult.validation.details
                      .filter(d => !d.matched)
                      .map(d => (
                        <div key={d.exampleIndex} className="unmatched-item">
                          <span className="unmatched-idx">#{d.exampleIndex + 1}</span>
                          <span className="unmatched-reason">{d.reason}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="candidates-tab">
            {currentResult.candidates?.length === 0 ? (
              <p className="no-candidates">No pattern-based candidates were generated.</p>
            ) : (
              currentResult.candidates?.map((c, i) => (
                <div key={i} className="candidate-item">
                  <div className="candidate-header">
                    <span className="candidate-num">Candidate {i + 1}</span>
                    <span className="candidate-conf">
                      {Math.round(c.confidence * 100)}% confidence
                    </span>
                  </div>
                  <SqlBlock sql={c.sql} compact />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Save query name modal */}
      {showSaveModal && (
        <div className="save-modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="save-modal" onClick={e => e.stopPropagation()}>
            <div className="save-modal-header">
              <span className="save-modal-title">Save Query</span>
              <button className="save-modal-close" onClick={() => setShowSaveModal(false)}>✕</button>
            </div>
            <div className="save-modal-body">
              <label className="save-modal-label">Query name</label>
              <input
                ref={saveInputRef}
                className="save-modal-input"
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={handleSaveKeyDown}
                placeholder="e.g. Active US Customers"
              />
            </div>
            <div className="save-modal-footer">
              <button className="save-modal-btn-cancel" onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button
                className="save-modal-btn-save"
                onClick={handleConfirmSave}
                disabled={!saveName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refine section — only shown when there's a valid result */}
      <div className="refine-section">
        <h3 className="refine-title">Refine Query</h3>
        <div className="refine-input-row">
          <input
            type="text"
            className="refine-input"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="e.g. 'Also filter by status = active' or 'Add ORDER BY created_at DESC'"
            onKeyDown={e => e.key === 'Enter' && !refining && handleRefine()}
            disabled={refining}
          />
          <button
            className="btn-refine"
            onClick={handleRefine}
            disabled={refining || !feedback.trim()}
          >
            {refining ? <span className="spinner-sm" /> : '↺'} Refine
          </button>
        </div>
        {history.length > 0 && (
          <p className="refine-history-hint">
            {history.length} refinement{history.length > 1 ? 's' : ''} applied —{' '}
            <button className="refine-undo-link" onClick={handleUndo}>undo last</button>
          </p>
        )}
      </div>
    </div>
  );
}
