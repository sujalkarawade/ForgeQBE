import React, { useState, useCallback } from 'react';
import { SessionProvider } from './context/SessionContext';
import Sidebar from './components/Sidebar/Sidebar';
import MainPanel from './components/MainPanel/MainPanel';
import ConnectModal from './components/ConnectModal/ConnectModal';
import './styles/App.css';

function App() {
  const [showConnect, setShowConnect] = useState(false);
  const [activeSavedQueryId, setActiveSavedQueryId] = useState(null);

  const handleLoadSavedQuery = useCallback(async (query) => {
    setActiveSavedQueryId(query.id);
    window.dispatchEvent(new CustomEvent('load-saved-query', { detail: query }));
  }, []);

  return (
    <SessionProvider>
      <div className="app">
        <Sidebar
          onConnectClick={() => setShowConnect(true)}
          onLoadSavedQuery={handleLoadSavedQuery}
          activeSavedQueryId={activeSavedQueryId}
        />
        <MainPanel />
        {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
      </div>
    </SessionProvider>
  );
}

export default App;
