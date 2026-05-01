import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import SchemaTree from './SchemaTree';
import QueryHistory from './QueryHistory';
import './Sidebar.css';

const tabs = ['Schema', 'History'];

export default function Sidebar({ onConnectClick }) {
  const { isConnected, connectionInfo, disconnect, schemaLoading } = useSession();
  const [activeTab, setActiveTab] = useState('Schema');

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">⬡</span>
          <span className="sidebar-logo-text">QBE Explorer</span>
        </div>
      </div>

      {/* Connection status */}
      <div className="sidebar-connection">
        {isConnected ? (
          <div className="connection-active">
            <div className="connection-dot connected" />
            <div className="connection-info">
              <span className="connection-db">{connectionInfo?.database}</span>
              <span className="connection-host">{connectionInfo?.host}:{connectionInfo?.port || 5432}</span>
            </div>
            <button className="btn-disconnect" onClick={disconnect} title="Disconnect">✕</button>
          </div>
        ) : (
          <button className="btn-connect" onClick={onConnectClick}>
            <span>⚡</span> Connect Database
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`sidebar-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="sidebar-content">
        {activeTab === 'Schema' && (
          schemaLoading
            ? <div className="sidebar-loading"><span className="spinner" /> Loading schema…</div>
            : <SchemaTree />
        )}
        {activeTab === 'History' && <QueryHistory />}
      </div>
    </aside>
  );
}
