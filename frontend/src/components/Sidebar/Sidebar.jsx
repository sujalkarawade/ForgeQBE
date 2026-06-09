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
          <div className="sidebar-logo-mark">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" />
            </svg>
          </div>
          <span className="sidebar-logo-text">ForgeQBE</span>
          <span className="sidebar-logo-badge">Beta</span>
        </div>
      </div>

      {/* Connection status */}
      <div className="sidebar-connection">
        {isConnected ? (
          <div className="connection-active">
            <div className="connection-pulse" />
            <div className="connection-info">
              <span className="connection-db">{connectionInfo?.database}</span>
              <span className="connection-host">{connectionInfo?.host}:{connectionInfo?.port || 5432}</span>
            </div>
            <button className="btn-disconnect" onClick={disconnect} title="Disconnect">
              Disconnect
            </button>
          </div>
        ) : (
          <button className="btn-connect" onClick={onConnectClick}>
            <svg className="btn-connect-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="5" cy="8" r="3" />
              <circle cx="11" cy="8" r="3" />
              <path d="M8 5v6" />
            </svg>
            Connect Database
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
