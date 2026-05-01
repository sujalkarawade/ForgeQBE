import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';
import toast from 'react-hot-toast';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);

  const connect = useCallback(async (dbConfig) => {
    const id = uuidv4();
    await api.post('/database/connect', { sessionId: id, ...dbConfig });
    setSessionId(id);
    setIsConnected(true);
    setConnectionInfo(dbConfig);

    // Load schema immediately after connecting
    setSchemaLoading(true);
    try {
      const res = await api.get(`/schema/${id}`);
      setSchema(res.data.schema);
    } catch (err) {
      toast.error('Connected but failed to load schema.');
    } finally {
      setSchemaLoading(false);
    }

    return id;
  }, []);

  const disconnect = useCallback(async () => {
    if (sessionId) {
      await api.delete(`/database/disconnect/${sessionId}`).catch(() => {});
    }
    setSessionId(null);
    setIsConnected(false);
    setConnectionInfo(null);
    setSchema(null);
    setQueryHistory([]);
  }, [sessionId]);

  const refreshSchema = useCallback(async () => {
    if (!sessionId) return;
    setSchemaLoading(true);
    try {
      const res = await api.get(`/schema/${sessionId}`);
      setSchema(res.data.schema);
    } finally {
      setSchemaLoading(false);
    }
  }, [sessionId]);

  const addToHistory = useCallback((entry) => {
    setQueryHistory(prev => [{ id: uuidv4(), timestamp: new Date().toISOString(), ...entry }, ...prev].slice(0, 50));
  }, []);

  return (
    <SessionContext.Provider value={{
      sessionId,
      isConnected,
      connectionInfo,
      schema,
      schemaLoading,
      queryHistory,
      connect,
      disconnect,
      refreshSchema,
      addToHistory,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
