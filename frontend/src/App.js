import React, { useState, useCallback } from 'react';
import { SessionProvider } from './context/SessionContext';
import Sidebar from './components/Sidebar/Sidebar';
import MainPanel from './components/MainPanel/MainPanel';
import ConnectModal from './components/ConnectModal/ConnectModal';
import './styles/App.css';

function App() {
  const [showConnect, setShowConnect] = useState(false);

  return (
    <SessionProvider>
      <div className="app">
        <Sidebar onConnectClick={() => setShowConnect(true)} />
        <MainPanel />
        {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
      </div>
    </SessionProvider>
  );
}

export default App;
