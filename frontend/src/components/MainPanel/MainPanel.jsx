import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import ExampleEditor from './ExampleEditor';
import QueryResult from './QueryResult';
import EmptyState from './EmptyState';
import './MainPanel.css';

export default function MainPanel() {
  const { isConnected } = useSession();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

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
