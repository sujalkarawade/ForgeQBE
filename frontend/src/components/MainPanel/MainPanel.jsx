import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ExampleEditor from './ExampleEditor';
import QueryResult from './QueryResult';
import EmptyState from './EmptyState';
import './MainPanel.css';

export default function MainPanel() {
  const { isConnected, sessionId } = useSession();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // When a saved query is clicked (via custom event from Sidebar), load it
  useEffect(() => {
    const handler = async (e) => {
      const query = e.detail;
      if (!sessionId || !query) return;
      setLoading(true);
      setResult(null);
      try {
        const res = await api.post('/query/execute', {
          sessionId,
          sql: query.sql,
        });
        setResult({
          sql: query.sql,
          explanation: query.explanation || 'Loaded from saved queries',
          results: {
            rows: res.data.rows,
            rowCount: res.data.rowCount,
            fields: res.data.fields,
            duration: res.data.duration,
          },
          validation: null,
          confidence: null,
          tablesUsed: [],
          candidates: [],
          reasoning: null,
          changesMade: null,
        });
        toast.success(`Loaded query: "${query.name}"`);
      } catch (err) {
        toast.error(`Failed to execute saved query: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener('load-saved-query', handler);
    return () => window.removeEventListener('load-saved-query', handler);
  }, [sessionId]);

  return (
    <main className="main-panel">
      <div className="main-header">
        <div className="main-header-left">
          <h1 className="main-title">Query by Example</h1>
          <span className="main-title-sep">/</span>
          <p className="main-subtitle">Show data examples → AI generates SQL</p>
        </div>
        <div className="main-header-badge">
          <span />
          Powered by OpenRouter
        </div>
      </div>

      <div className="main-content">
        {!isConnected ? (
          <EmptyState />
        ) : (
          <div className="main-workspace">
            <ExampleEditor
              onResult={setResult}
              onLoading={setLoading}
              loading={loading}
            />
            {(result || loading) && (
              <QueryResult result={result} loading={loading} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
