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
          <p className="main-subtitle">Show examples of data you want → AI generates the SQL</p>
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
